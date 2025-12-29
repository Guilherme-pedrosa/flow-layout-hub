import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const payload = await req.json();
    console.log("[inter-pix-payment] Request received:", JSON.stringify(payload));

    // Get GCP Function configuration
    const gcpFunctionUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    const gcpFunctionSecret = Deno.env.get("GCP_PIX_FUNCTION_SECRET");

    if (!gcpFunctionUrl || !gcpFunctionSecret) {
      throw new Error("GCP Function não configurada. Configure os secrets GCP_PIX_FUNCTION_URL e GCP_PIX_FUNCTION_SECRET.");
    }

    let paymentData: {
      companyId: string;
      pixKey: string;
      pixKeyType: string;
      amount: number;
      recipientName: string;
      recipientDocument: string;
      description?: string;
    };
    let pixPaymentId: string | null = null;
    let payableId: string | null = null;

    // Handle retry case
    if (payload.paymentId && !payload.company_id) {
      console.log(`[inter-pix-payment] Modo retry - buscando pagamento ${payload.paymentId}`);
      
      const { data: existingPayment, error: fetchError } = await supabase
        .from("inter_pix_payments")
        .select("*")
        .eq("id", payload.paymentId)
        .single();

      if (fetchError || !existingPayment) {
        throw new Error("Pagamento não encontrado para retry");
      }

      pixPaymentId = existingPayment.id;
      payableId = existingPayment.payable_id;
      paymentData = {
        companyId: existingPayment.company_id,
        pixKey: existingPayment.pix_key,
        pixKeyType: existingPayment.pix_key_type,
        amount: existingPayment.amount,
        recipientName: existingPayment.recipient_name,
        recipientDocument: existingPayment.recipient_document,
        description: existingPayment.description
      };

      // Update status to processing
      await supabase
        .from("inter_pix_payments")
        .update({ 
          status: "processing",
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", pixPaymentId);

      console.log(`[inter-pix-payment] Retry: R$ ${paymentData.amount} para ${paymentData.recipientName}`);

    } else {
      // New payment - validate required fields
      const { 
        company_id, 
        pix_key, 
        pix_key_type, 
        amount, 
        recipient_name, 
        recipient_document, 
        description,
        payable_id,
        payment_id,
        is_approval
      } = payload;

      if (!company_id || !pix_key || !pix_key_type || !amount || !recipient_name || !recipient_document) {
        throw new Error("Campos obrigatórios: company_id, pix_key, pix_key_type, amount, recipient_name, recipient_document");
      }

      if (amount <= 0) {
        throw new Error("O valor deve ser maior que zero");
      }

      payableId = payable_id || null;
      paymentData = { 
        companyId: company_id, 
        pixKey: pix_key, 
        pixKeyType: pix_key_type, 
        amount, 
        recipientName: recipient_name, 
        recipientDocument: recipient_document, 
        description 
      };

      // Check if it's an approval/retry of existing payment
      if (is_approval && payment_id) {
        pixPaymentId = payment_id;
        await supabase
          .from("inter_pix_payments")
          .update({ 
            status: "processing",
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", pixPaymentId);
      } else if (!payment_id) {
        // Create new payment record
        const { data: newPayment, error: insertError } = await supabase
          .from("inter_pix_payments")
          .insert({
            company_id: company_id,
            pix_key: pix_key,
            pix_key_type: pix_key_type,
            amount: amount,
            recipient_name: recipient_name,
            recipient_document: recipient_document,
            description: description || `PIX para ${recipient_name}`,
            payable_id: payable_id || null,
            status: "processing"
          })
          .select()
          .single();

        if (insertError) {
          console.error("[inter-pix-payment] Erro ao criar registro:", insertError);
          throw new Error("Erro ao criar registro de pagamento");
        }

        pixPaymentId = newPayment.id;
      } else {
        pixPaymentId = payment_id;
      }
    }

    console.log(`[inter-pix-payment] Payment ID: ${pixPaymentId}`);

    // Fetch Inter credentials from database
    console.log(`[inter-pix-payment] Fetching credentials for company: ${paymentData.companyId}`);
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", paymentData.companyId)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      console.error("[inter-pix-payment] Credentials error:", credError);
      throw new Error("Credenciais Inter não configuradas para esta empresa");
    }

    console.log(`[inter-pix-payment] Credentials found, downloading certificates...`);

    // Download certificate and private key from storage
    const { data: certData, error: certError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.certificate_file_path);

    if (certError || !certData) {
      console.error("[inter-pix-payment] Certificate download error:", certError);
      throw new Error("Erro ao baixar certificado");
    }

    const { data: keyData, error: keyError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.private_key_file_path);

    if (keyError || !keyData) {
      console.error("[inter-pix-payment] Private key download error:", keyError);
      throw new Error("Erro ao baixar chave privada");
    }

    // Convert to base64 for transmission
    const certText = await certData.text();
    const keyText = await keyData.text();
    const certBase64 = encode(certText);
    const keyBase64 = encode(keyText);

    console.log(`[inter-pix-payment] Certificates loaded, calling GCP Function...`);

    // Prepare payload for GCP Function (includes credentials and certificates)
    const gcpPayload = {
      // Payment data
      pixKey: paymentData.pixKey,
      pixKeyType: paymentData.pixKeyType,
      amount: paymentData.amount,
      recipientName: paymentData.recipientName,
      recipientDocument: paymentData.recipientDocument,
      description: paymentData.description,
      // Credentials
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret,
      accountNumber: credentials.account_number,
      // Certificates (base64 encoded)
      certificate: certBase64,
      privateKey: keyBase64
    };

    console.log(`[inter-pix-payment] Calling GCP Function: ${gcpFunctionUrl}`);

    // Call GCP Function
    const gcpResponse = await fetch(gcpFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gcpFunctionSecret}`
      },
      body: JSON.stringify(gcpPayload)
    });

    const gcpResult = await gcpResponse.json();
    console.log("[inter-pix-payment] GCP Response:", JSON.stringify(gcpResult));

    if (!gcpResponse.ok || gcpResult.error) {
      const errorMsg = gcpResult.error || `Erro HTTP ${gcpResponse.status}`;
      
      // Update payment as failed
      await supabase
        .from("inter_pix_payments")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString()
        })
        .eq("id", pixPaymentId);

      // Update payable status if linked
      if (payableId) {
        await supabase
          .from("payables")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", payableId);
      }

      // Log audit
      await supabase.from("audit_logs").insert({
        company_id: paymentData.companyId,
        entity: "inter_pix_payments",
        entity_id: pixPaymentId,
        action: "pix_payment_failed",
        metadata_json: { error: errorMsg, details: gcpResult.details }
      });

      throw new Error(errorMsg);
    }

    // Payment successful or pending approval
    const isPendingApproval = gcpResult.pendingApproval || 
      ["AGUARDANDO_APROVACAO", "PENDENTE", "EM_PROCESSAMENTO", "AGENDADO"].includes(gcpResult.status);
    
    const internalStatus = isPendingApproval ? "pending_approval" : "completed";
    
    await supabase
      .from("inter_pix_payments")
      .update({
        status: internalStatus,
        inter_transaction_id: gcpResult.transactionId,
        inter_end_to_end_id: gcpResult.endToEndId,
        inter_status: gcpResult.status,
        inter_response: gcpResult.raw || gcpResult,
        processed_at: isPendingApproval ? null : new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", pixPaymentId);

    // Update linked payable if exists
    if (payableId) {
      if (isPendingApproval) {
        await supabase
          .from("payables")
          .update({
            payment_status: "pending_approval",
            inter_payment_id: pixPaymentId,
            updated_at: new Date().toISOString()
          })
          .eq("id", payableId);
      } else {
        await supabase
          .from("payables")
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            paid_amount: paymentData.amount,
            payment_method: "pix",
            payment_status: "paid",
            inter_payment_id: pixPaymentId,
            updated_at: new Date().toISOString()
          })
          .eq("id", payableId);
      }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      company_id: paymentData.companyId,
      entity: "inter_pix_payments",
      entity_id: pixPaymentId,
      action: isPendingApproval ? "pix_payment_pending_approval" : "pix_payment_completed",
      metadata_json: {
        transactionId: gcpResult.transactionId,
        endToEndId: gcpResult.endToEndId,
        amount: paymentData.amount,
        recipient: paymentData.recipientName
      }
    });

    // Log payment audit
    await supabase.from("payment_audit_logs").insert({
      payable_id: payableId || pixPaymentId!,
      action: isPendingApproval ? "pix_pending_approval" : "pix_payment_sent",
      old_status: "processing",
      new_status: internalStatus,
      metadata: {
        transactionId: gcpResult.transactionId,
        amount: paymentData.amount,
        recipient: paymentData.recipientName,
        pixKey: paymentData.pixKey
      }
    });

    console.log(`[inter-pix-payment] Success - Status: ${internalStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: pixPaymentId,
        status: internalStatus,
        transactionId: gcpResult.transactionId,
        endToEndId: gcpResult.endToEndId,
        pendingApproval: isPendingApproval
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[inter-pix-payment] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
