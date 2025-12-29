import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PixPaymentRequest {
  company_id: string;
  payable_id?: string;
  recipient_name: string;
  recipient_document: string;
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "telefone" | "aleatorio";
  amount: number;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PixPaymentRequest = await req.json();
    console.log(`[inter-pix-payment] Processando pagamento PIX: R$ ${payload.amount} para ${payload.recipient_name}`);

    // Validações básicas
    if (!payload.company_id || !payload.recipient_name || !payload.pix_key || !payload.amount) {
      throw new Error("Campos obrigatórios: company_id, recipient_name, pix_key, amount");
    }

    if (payload.amount <= 0) {
      throw new Error("O valor deve ser maior que zero");
    }

    // Buscar credenciais do Banco Inter
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", payload.company_id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas ou inativas");
    }

    // Criar registro do pagamento
    const { data: payment, error: insertError } = await supabase
      .from("inter_pix_payments")
      .insert({
        company_id: payload.company_id,
        payable_id: payload.payable_id || null,
        recipient_name: payload.recipient_name,
        recipient_document: payload.recipient_document,
        pix_key: payload.pix_key,
        pix_key_type: payload.pix_key_type,
        amount: payload.amount,
        description: payload.description || `PIX para ${payload.recipient_name}`,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[inter-pix-payment] Erro ao criar registro:", insertError);
      throw new Error("Erro ao registrar pagamento");
    }

    console.log(`[inter-pix-payment] Pagamento registrado: ${payment.id}`);

    // ==========================================
    // SIMULAÇÃO - Em produção, usar API real do Inter
    // ==========================================
    // Aqui seria feita a chamada real para a API do Banco Inter
    // usando mTLS com os certificados armazenados em inter_credentials
    // 
    // Exemplo de endpoint real:
    // POST https://cdpj.partners.bancointer.com.br/banking/v2/pix
    // 
    // Body:
    // {
    //   "valor": payload.amount,
    //   "dataPagamento": new Date().toISOString().split('T')[0],
    //   "descricao": payload.description,
    //   "destinatario": {
    //     "tipo": "CHAVE",
    //     "chave": payload.pix_key,
    //     "nome": payload.recipient_name,
    //     "cpfCnpj": payload.recipient_document
    //   }
    // }
    // ==========================================

    // Simular processamento (MVP)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Gerar IDs simulados
    const endToEndId = `E${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const transactionId = `TXN${Date.now()}`;

    // Atualizar com resposta simulada de sucesso
    const { error: updateError } = await supabase
      .from("inter_pix_payments")
      .update({
        status: "completed",
        inter_status: "REALIZADO",
        inter_end_to_end_id: endToEndId,
        inter_transaction_id: transactionId,
        inter_response: {
          codigoSolicitacao: transactionId,
          endToEndId: endToEndId,
          dataPagamento: new Date().toISOString().split('T')[0],
          status: "REALIZADO",
        },
        processed_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("[inter-pix-payment] Erro ao atualizar status:", updateError);
    }

    // Se estava vinculado a um payable, marcar como pago
    if (payload.payable_id) {
      await supabase
        .from("payables")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          paid_amount: payload.amount,
          payment_method: "pix",
        })
        .eq("id", payload.payable_id);
      
      console.log(`[inter-pix-payment] Payable ${payload.payable_id} marcado como pago`);
    }

    // Log de auditoria
    await supabase.from("audit_logs").insert({
      company_id: payload.company_id,
      action: "pix_payment",
      entity: "inter_pix_payments",
      entity_id: payment.id,
      metadata_json: {
        amount: payload.amount,
        recipient: payload.recipient_name,
        pix_key: payload.pix_key,
        end_to_end_id: endToEndId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        end_to_end_id: endToEndId,
        transaction_id: transactionId,
        status: "completed",
        message: "PIX enviado com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-pix-payment] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
