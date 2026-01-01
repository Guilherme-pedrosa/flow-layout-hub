import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayableRow {
  emissao: string;
  vencimento: string;
  valor: number;
  fornecedor: string;
  cpf_cnpj: string;
  historico: string;
  documento: string;
  forma_pagamento: string;
  previsao: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvData, skipForecast = true } = await req.json();

    if (!csvData || !Array.isArray(csvData)) {
      return new Response(
        JSON.stringify({ error: "csvData deve ser um array de objetos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      total: csvData.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      suppliers_created: 0,
    };

    // Cache de fornecedores
    const supplierCache = new Map<string, string>();

    for (const row of csvData) {
      try {
        // Pular previsões se configurado
        if (skipForecast && row.previsao === true) {
          results.skipped++;
          continue;
        }

        // Buscar ou criar fornecedor
        let supplierId = supplierCache.get(row.fornecedor);
        
        if (!supplierId) {
          // Buscar fornecedor existente
          const { data: existingSupplier } = await supabase
            .from("pessoas")
            .select("id")
            .eq("razao_social", row.fornecedor)
            .single();

          if (existingSupplier) {
            supplierId = existingSupplier.id;
          } else {
            // Criar novo fornecedor
            const cpfCnpj = row.cpf_cnpj?.toString().replace(/\D/g, "") || "";
            const tipoPessoa = cpfCnpj.length > 11 ? "PJ" : "PF";
            
            const { data: newSupplier, error: supplierError } = await supabase
              .from("pessoas")
              .insert({
                razao_social: row.fornecedor,
                cpf_cnpj: cpfCnpj,
                tipo_pessoa: tipoPessoa,
                is_active: true,
              })
              .select("id")
              .single();

            if (supplierError) {
              results.errors.push(`Erro ao criar fornecedor ${row.fornecedor}: ${supplierError.message}`);
              continue;
            }
            supplierId = newSupplier.id;
            results.suppliers_created++;
          }
          supplierCache.set(row.fornecedor, supplierId);
        }

        // Converter datas
        const parseDate = (dateStr: string): string | null => {
          if (!dateStr) return null;
          // Formato: DD/MM/YYYY HH:MM ou DD/MM/YYYY
          const parts = dateStr.split(" ")[0].split("/");
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
          return null;
        };

        const dueDate = parseDate(row.vencimento);

        if (!dueDate) {
          results.errors.push(`Data de vencimento inválida: ${row.vencimento}`);
          continue;
        }

        // Converter valor (pode vir negativo do GC)
        const amount = Math.abs(parseFloat(String(row.valor).replace(",", ".")) || 0);

        if (amount === 0) {
          results.errors.push(`Valor inválido: ${row.valor}`);
          continue;
        }

        // Mapear forma de pagamento
        let paymentMethod = "pix";
        const formaPag = (row.forma_pagamento || "").toLowerCase();
        if (formaPag.includes("boleto")) paymentMethod = "boleto";
        else if (formaPag.includes("cartao") || formaPag.includes("cartão")) paymentMethod = "cartao";
        else if (formaPag.includes("dinheiro")) paymentMethod = "dinheiro";
        else if (formaPag.includes("transferencia") || formaPag.includes("ted") || formaPag.includes("doc")) paymentMethod = "transferencia";

        // Inserir conta a pagar - apenas campos que existem na tabela
        const { error: payableError } = await supabase
          .from("payables")
          .insert({
            supplier_id: supplierId,
            amount: amount,
            due_date: dueDate,
            description: row.historico || "",
            document_number: row.documento || "",
            document_type: "manual",
            payment_method: paymentMethod,
            is_forecast: false,
            is_paid: false,
          });

        if (payableError) {
          results.errors.push(`Erro ao inserir conta: ${payableError.message}`);
        } else {
          results.imported++;
        }
      } catch (err) {
        results.errors.push(`Erro inesperado: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
