import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { type, companyId } = body;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    console.log("[financial-ai] Request received:", { type, messagesCount: messages.length, companyId });

    // === VALIDATE INPUT ===
    if (!companyId || typeof companyId !== 'string') {
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required and must not be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages in conversation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENAI_API_KEY) {
      console.error("[financial-ai] OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      console.error("[financial-ai] Company not found:", companyId);
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[financial-ai] Fetching data for company:", company.name);

    // Fetch data for context
    let fullContext = "";

    try {
      // Fetch financial data
      const [
        { data: payables },
        { data: receivables },
        { data: transactions },
        { data: lowStockProducts }
      ] = await Promise.all([
        supabase
          .from("payables")
          .select("*, supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia, cpf_cnpj)")
          .eq("company_id", companyId)
          .eq("is_paid", false)
          .order("due_date", { ascending: true })
          .limit(100),
        supabase
          .from("accounts_receivable")
          .select("*, client:clientes(razao_social, nome_fantasia, cpf_cnpj)")
          .eq("company_id", companyId)
          .eq("is_paid", false)
          .order("due_date", { ascending: true })
          .limit(100),
        supabase
          .from("bank_transactions")
          .select("*, bank_account:bank_accounts(name, bank_name)")
          .eq("company_id", companyId)
          .order("transaction_date", { ascending: false })
          .limit(50),
        supabase
          .from("products")
          .select("id, code, name, description, current_stock, minimum_stock, cost_price, sale_price")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .eq("stock_control", true)
          .lte("current_stock", 10)
          .limit(50)
      ]);

      const today = new Date().toISOString().split('T')[0];
      const overduePayables = payables?.filter(p => p.due_date < today) || [];
      const overdueReceivables = receivables?.filter(r => r.due_date < today) || [];

      // Calculate totals
      const totalPayables = payables?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalReceivables = receivables?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const totalOverduePayables = overduePayables.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOverdueReceivables = overdueReceivables.reduce((sum, r) => sum + (r.amount || 0), 0);

      fullContext = `
## 📊 CONTEXTO FINANCEIRO (${today})

### 💰 RESUMO
- Contas a Pagar Pendentes: ${payables?.length || 0} títulos (R$ ${totalPayables.toFixed(2)})
- Contas a Pagar Vencidas: ${overduePayables.length} títulos (R$ ${totalOverduePayables.toFixed(2)})
- Contas a Receber Pendentes: ${receivables?.length || 0} títulos (R$ ${totalReceivables.toFixed(2)})
- Contas a Receber Vencidas: ${overdueReceivables.length} títulos (R$ ${totalOverdueReceivables.toFixed(2)})
- Produtos com Estoque Baixo: ${lowStockProducts?.length || 0}

### Contas a Pagar Vencidas (${overduePayables.length} registros)
${JSON.stringify(overduePayables.slice(0, 20).map(p => ({
  descricao: p.description,
  valor: p.amount,
  vencimento: p.due_date,
  fornecedor: p.supplier?.razao_social || p.supplier?.nome_fantasia,
  metodo_pagamento: p.payment_method_type,
  dias_atraso: Math.floor((new Date().getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### Contas a Receber Vencidas (${overdueReceivables.length} registros)
${JSON.stringify(overdueReceivables.slice(0, 20).map(r => ({
  descricao: r.description,
  valor: r.amount,
  vencimento: r.due_date,
  cliente: r.client?.razao_social || r.client?.nome_fantasia,
  dias_atraso: Math.floor((new Date().getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### Produtos com Estoque Baixo (${lowStockProducts?.length || 0} produtos)
${JSON.stringify(lowStockProducts?.map(p => ({
  codigo: p.code,
  nome: p.name,
  estoque_atual: p.current_stock,
  estoque_minimo: p.minimum_stock
})), null, 2)}

### Últimas Transações Bancárias
${JSON.stringify(transactions?.slice(0, 15).map(t => ({
  data: t.transaction_date,
  descricao: t.description,
  valor: t.amount,
  tipo: t.type,
  conta: t.bank_account?.name,
  conciliado: t.is_reconciled
})), null, 2)}
`;
    } catch (dataError) {
      console.error("[financial-ai] Error fetching data:", dataError);
      fullContext = "## Dados não disponíveis\nNão foi possível carregar os dados financeiros.";
    }

    const systemPrompt = `Você é um assistente de inteligência artificial financeira do ERP WAI. Você analisa dados financeiros e fornece insights práticos.

## SUAS CAPACIDADES
1. Análise de contas a pagar e receber
2. Detecção de vencimentos e atrasos
3. Projeção de fluxo de caixa
4. Identificação de riscos financeiros
5. Sugestões de priorização de pagamentos

## REGRAS DE RESPOSTA
- Seja direto e objetivo
- Use dados concretos do contexto fornecido
- Destaque riscos (🚨 crítico, ⚠️ atenção) e oportunidades (✅ ok, 💡 sugestão)
- Formate em Markdown para legibilidade
- Sugira ações práticas quando relevante

${fullContext}`;

    // Use streaming
    const useStreaming = type !== 'cfop_suggestion';
    
    console.log("[financial-ai] Calling OpenAI GPT, streaming:", useStreaming);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const apiKey = LOVABLE_API_KEY || OPENAI_API_KEY;
    const apiUrl = LOVABLE_API_KEY 
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    
    if (!apiKey) {
      console.error("[financial-ai] No API key configured");
      throw new Error("No API key configured");
    }

    console.log("[financial-ai] Using API:", LOVABLE_API_KEY ? "Lovable AI" : "OpenAI", "streaming:", useStreaming);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LOVABLE_API_KEY ? "google/gemini-2.5-flash" : "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: useStreaming,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });
    
    console.log("[financial-ai] OpenAI response status:", response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("[financial-ai] OpenAI error:", response.status, t);
      return new Response(JSON.stringify({ error: "OpenAI API error: " + t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For non-streaming requests, return JSON directly
    if (!useStreaming) {
      const data = await response.json();
      console.log("[financial-ai] Non-streaming response received");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[financial-ai] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
