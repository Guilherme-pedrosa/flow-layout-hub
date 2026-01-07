import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface AddressInput {
  zipCode: string;
  street: string;
  number: string;
  district: string;
  complement?: string;
  city: string;
  state: string;
}

interface CustomerInput {
  company_id: string;
  wai_customer_id?: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address: AddressInput;
}

/**
 * FIELD-UPSERT-CUSTOMER
 * 
 * Fluxo: WAI → Field Control (Master = Field)
 * 
 * 1. Se field_customer_id existe no WAI → PUT no Field
 * 2. Se não existe → POST no Field
 * 3. Retorna { field_customer_id: "..." }
 * 4. Atualiza o cliente no WAI com field_customer_id
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIELD_CONTROL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIELD_CONTROL_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: CustomerInput = await req.json();

    // Validações
    if (!input.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!input.name || input.name.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome deve ter pelo menos 6 caracteres (exigência Field Control)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanZip = input.address?.zipCode?.replace(/\D/g, '') || '';
    if (cleanZip.length !== 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'CEP deve ter 8 dígitos válidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[field-upsert-customer] Processando: ${input.name}, company=${input.company_id}`);

    // Verificar se já existe field_customer_id no WAI
    let existingFieldId: string | null = null;
    
    if (input.wai_customer_id) {
      const { data: existingClient } = await supabase
        .from('clientes')
        .select('field_customer_id')
        .eq('id', input.wai_customer_id)
        .eq('company_id', input.company_id)
        .maybeSingle();
      
      existingFieldId = existingClient?.field_customer_id || null;
      console.log(`[field-upsert-customer] field_customer_id existente: ${existingFieldId || 'N/A'}`);
    }

    // Montar payload do Field Control
    const fieldPayload = {
      name: input.name,
      contact: {
        email: input.email || '',
        phone: input.phone?.replace(/\D/g, '') || ''
      },
      address: {
        zipCode: cleanZip,
        street: input.address.street || '',
        number: input.address.number || '',
        neighborhood: input.address.district || '',
        complement: input.address.complement || '',
        city: input.address.city || '',
        state: input.address.state || '',
        coords: { latitude: 0, longitude: 0 }
      }
    };

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    let response: Response;
    let action: string;

    if (existingFieldId) {
      // PUT - Atualizar cliente existente no Field
      console.log(`[field-upsert-customer] PUT ${existingFieldId}`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${existingFieldId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(fieldPayload)
      });
      action = 'update';
    } else {
      // POST - Criar novo cliente no Field
      console.log(`[field-upsert-customer] POST novo cliente`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldPayload)
      });
      action = 'create';
    }

    // Tratar resposta
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[field-upsert-customer] Erro Field ${response.status}: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro no Field Control: HTTP ${response.status}`,
          details: errorText,
          action
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const fieldCustomerId = result.id || existingFieldId;

    if (!fieldCustomerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Field Control não retornou ID do cliente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[field-upsert-customer] Sucesso: ${action} → field_customer_id=${fieldCustomerId}`);

    // Atualizar o campo field_customer_id no WAI (se tiver wai_customer_id)
    if (input.wai_customer_id) {
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ 
          field_customer_id: fieldCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.wai_customer_id)
        .eq('company_id', input.company_id);

      if (updateError) {
        console.error(`[field-upsert-customer] Erro atualizando WAI: ${updateError.message}`);
      }
    }

    // Também manter sincronização na tabela field_control_sync (compatibilidade)
    if (input.wai_customer_id) {
      await supabase.from('field_control_sync').upsert({
        company_id: input.company_id,
        entity_type: 'customer',
        wai_id: input.wai_customer_id,
        field_id: fieldCustomerId,
        last_sync: new Date().toISOString()
      }, { onConflict: 'wai_id,entity_type' });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        field_customer_id: fieldCustomerId,
        action
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-upsert-customer] Erro: ${msg}`);
    
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
