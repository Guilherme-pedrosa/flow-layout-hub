import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  company_id: string;
  action: 'import_snapshot' | 'run_matching' | 'apply_matches' | 'status';
  snapshot_data?: any[];
}

interface MatchResult {
  wai_customer_id: string;
  wai_name: string;
  wai_address: string;
  field_candidate_id: string | null;
  field_candidate_name: string | null;
  match_score: number;
  match_reason: string;
  match_status: 'AUTO_LINK' | 'REVIEW' | 'CREATE_NEW';
}

/**
 * Normaliza texto para comparação (remove acentos, lowercase, trim)
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpa documento (só números)
 */
function cleanDocument(doc: string | null | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

/**
 * Calcula similaridade entre duas strings (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  
  // Levenshtein-based similarity
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 100;
  
  // Simplified: check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.round((Math.min(len1, len2) / maxLen) * 100);
  }
  
  // Word-based matching
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const matchingWords = words1.filter(w1 => 
    words2.some(w2 => w2.includes(w1) || w1.includes(w2))
  );
  
  return Math.round((matchingWords.length / Math.max(words1.length, words2.length)) * 100);
}

/**
 * Calcula score de matching entre cliente WAI e candidato Field
 */
function calculateMatchScore(
  waiCustomer: any,
  fieldCandidate: any
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  
  const waiName = normalizeText(waiCustomer.nome_fantasia || waiCustomer.razao_social);
  const fieldName = normalizeText(fieldCandidate.name);
  const fieldLocationName = normalizeText(fieldCandidate.location_name);
  
  // 1. Nome exato (40 pontos)
  if (waiName && (waiName === fieldName || waiName === fieldLocationName)) {
    score += 40;
    reasons.push('Nome exato');
  } else {
    // Nome similar (0-30 pontos)
    const nameSimilarity = Math.max(
      calculateSimilarity(waiName, fieldName),
      calculateSimilarity(waiName, fieldLocationName)
    );
    if (nameSimilarity >= 80) {
      score += 30;
      reasons.push(`Nome similar (${nameSimilarity}%)`);
    } else if (nameSimilarity >= 60) {
      score += 20;
      reasons.push(`Nome parcial (${nameSimilarity}%)`);
    } else if (nameSimilarity >= 40) {
      score += 10;
      reasons.push(`Nome baixo (${nameSimilarity}%)`);
    }
  }
  
  // 2. Endereço (30 pontos)
  const waiCity = normalizeText(waiCustomer.cidade);
  const waiState = normalizeText(waiCustomer.estado);
  const waiStreet = normalizeText(waiCustomer.logradouro);
  const waiNumber = normalizeText(waiCustomer.numero);
  
  const fieldCity = normalizeText(fieldCandidate.city);
  const fieldState = normalizeText(fieldCandidate.state);
  const fieldStreet = normalizeText(fieldCandidate.street);
  const fieldNumber = normalizeText(fieldCandidate.number);
  
  // Cidade + Estado (15 pontos)
  if (waiCity && fieldCity && waiCity === fieldCity) {
    score += 10;
    reasons.push('Mesma cidade');
    
    if (waiState && fieldState && waiState === fieldState) {
      score += 5;
      reasons.push('Mesmo estado');
    }
  }
  
  // Rua + Número (15 pontos)
  if (waiStreet && fieldStreet) {
    const streetSimilarity = calculateSimilarity(waiStreet, fieldStreet);
    if (streetSimilarity >= 80) {
      score += 10;
      reasons.push('Mesma rua');
      
      if (waiNumber && fieldNumber && waiNumber === fieldNumber) {
        score += 5;
        reasons.push('Mesmo número');
      }
    }
  }
  
  // 3. CEP (15 pontos)
  const waiCep = cleanDocument(waiCustomer.cep);
  const fieldCep = cleanDocument(fieldCandidate.cep);
  
  if (waiCep && fieldCep && waiCep.length >= 5 && fieldCep.length >= 5) {
    if (waiCep === fieldCep) {
      score += 15;
      reasons.push('CEP exato');
    } else if (waiCep.substring(0, 5) === fieldCep.substring(0, 5)) {
      score += 8;
      reasons.push('CEP similar');
    }
  }
  
  // 4. CNPJ (15 pontos) - apenas para confirmar, não para bloquear
  const waiDoc = cleanDocument(waiCustomer.cpf_cnpj);
  const fieldDoc = cleanDocument(fieldCandidate.document);
  
  if (waiDoc && fieldDoc && waiDoc === fieldDoc) {
    score += 15;
    reasons.push('CNPJ igual');
  }
  
  return {
    score: Math.min(score, 100),
    reason: reasons.length > 0 ? reasons.join(' + ') : 'Sem critérios correspondentes'
  };
}

/**
 * Determina status baseado no score
 */
function determineStatus(score: number): 'AUTO_LINK' | 'REVIEW' | 'CREATE_NEW' {
  if (score >= 80) return 'AUTO_LINK';
  if (score >= 50) return 'REVIEW';
  return 'CREATE_NEW';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: MatchRequest = await req.json();
    const { company_id, action, snapshot_data } = payload;

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== IMPORT SNAPSHOT ==========
    if (action === 'import_snapshot') {
      if (!snapshot_data || !Array.isArray(snapshot_data)) {
        return new Response(
          JSON.stringify({ success: false, error: 'snapshot_data é obrigatório (array)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[field-match] Importando ${snapshot_data.length} clientes do Field...`);

      // Limpar snapshot anterior
      await supabase
        .from('field_customers_snapshot')
        .delete()
        .eq('company_id', company_id);

      // Inserir novos
      const insertData = snapshot_data.map((row: any) => ({
        company_id,
        field_id: row['ID'] || row.id,
        name: row['Nome do cliente'] || row.name,
        document: cleanDocument(row['CPF/CNPJ'] || row.document),
        location_name: row['Nome da Localização'] || row.location_name,
        cep: row['CEP'] || row.cep,
        street: row['Rua'] || row.street,
        number: row['Número'] || row.number,
        complement: row['Complemento'] || row.complement,
        neighborhood: row['Bairro'] || row.neighborhood,
        city: row['Cidade'] || row.city,
        state: row['Estado'] || row.state,
        full_address: row['Endereço Completo'] || row.full_address,
        latitude: parseFloat(row['Latitude']) || null,
        longitude: parseFloat(row['Longitude']) || null,
        raw_data: row
      })).filter((r: any) => r.field_id);

      const { error: insertError } = await supabase
        .from('field_customers_snapshot')
        .insert(insertData);

      if (insertError) {
        console.error('[field-match] Erro inserindo snapshot:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({
        success: true,
        imported: insertData.length,
        message: `${insertData.length} clientes do Field importados para matching`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== RUN MATCHING ==========
    if (action === 'run_matching') {
      console.log('[field-match] Iniciando matching...');

      // Buscar clientes WAI (pessoas que são clientes)
      const { data: waiCustomers, error: waiError } = await supabase
        .from('pessoas')
        .select('id, razao_social, nome_fantasia, cpf_cnpj, cep, logradouro, numero, bairro, cidade, estado')
        .eq('company_id', company_id)
        .eq('is_cliente', true)
        .eq('is_active', true)
        .order('razao_social');

      if (waiError) throw waiError;

      // Buscar snapshot do Field
      const { data: fieldCandidates, error: fieldError } = await supabase
        .from('field_customers_snapshot')
        .select('*')
        .eq('company_id', company_id);

      if (fieldError) throw fieldError;

      if (!fieldCandidates || fieldCandidates.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Nenhum cliente do Field no snapshot. Execute import_snapshot primeiro.'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`[field-match] ${waiCustomers?.length || 0} clientes WAI, ${fieldCandidates.length} candidatos Field`);

      // Limpar resultados anteriores
      await supabase
        .from('field_matching_results')
        .delete()
        .eq('company_id', company_id);

      // Processar cada cliente WAI
      const results: MatchResult[] = [];
      let autoLink = 0, review = 0, createNew = 0;

      for (const waiCustomer of (waiCustomers || [])) {
        let bestMatch: { candidate: any; score: number; reason: string } | null = null;

        // Comparar com todos os candidatos do Field
        for (const fieldCandidate of fieldCandidates) {
          const { score, reason } = calculateMatchScore(waiCustomer, fieldCandidate);

          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { candidate: fieldCandidate, score, reason };
          }
        }

        const status = bestMatch && bestMatch.score >= 50 
          ? determineStatus(bestMatch.score) 
          : 'CREATE_NEW';

        if (status === 'AUTO_LINK') autoLink++;
        else if (status === 'REVIEW') review++;
        else createNew++;

        // Inserir resultado
        await supabase.from('field_matching_results').insert({
          company_id,
          wai_customer_id: waiCustomer.id,
          field_candidate_id: bestMatch && bestMatch.score >= 50 ? bestMatch.candidate.field_id : null,
          match_score: bestMatch?.score || 0,
          match_reason: bestMatch?.reason || 'Sem match encontrado',
          match_status: status
        });

        results.push({
          wai_customer_id: waiCustomer.id,
          wai_name: waiCustomer.nome_fantasia || waiCustomer.razao_social || 'Sem nome',
          wai_address: `${waiCustomer.logradouro || ''}, ${waiCustomer.numero || ''} - ${waiCustomer.cidade || ''}/${waiCustomer.estado || ''}`,
          field_candidate_id: bestMatch && bestMatch.score >= 50 ? bestMatch.candidate.field_id : null,
          field_candidate_name: bestMatch && bestMatch.score >= 50 ? bestMatch.candidate.name : null,
          match_score: bestMatch?.score || 0,
          match_reason: bestMatch?.reason || 'Sem match encontrado',
          match_status: status
        });
      }

      return new Response(JSON.stringify({
        success: true,
        total: results.length,
        auto_link: autoLink,
        review: review,
        create_new: createNew,
        message: `Matching concluído: ${autoLink} automáticos, ${review} para revisão, ${createNew} novos`,
        results: results.slice(0, 50) // Retorna preview dos primeiros 50
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== APPLY MATCHES ==========
    if (action === 'apply_matches') {
      console.log('[field-match] Aplicando matches...');

      // Buscar matches AUTO_LINK e REVIEW que foram aprovados
      const { data: approvedMatches, error: matchError } = await supabase
        .from('field_matching_results')
        .select('wai_customer_id, field_candidate_id, match_status')
        .eq('company_id', company_id)
        .in('match_status', ['AUTO_LINK', 'APPROVED']);

      if (matchError) throw matchError;

      let linked = 0;
      for (const match of (approvedMatches || [])) {
        if (match.field_candidate_id) {
          // Criar vínculo no field_control_sync
          const { error: syncError } = await supabase
            .from('field_control_sync')
            .upsert({
              company_id,
              entity_type: 'customer_matched',
              wai_id: match.wai_customer_id,
              field_id: match.field_candidate_id,
              last_sync: new Date().toISOString()
            }, { onConflict: 'wai_id,entity_type' });

          if (!syncError) linked++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        linked,
        message: `${linked} clientes vinculados ao Field Control`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== STATUS ==========
    if (action === 'status') {
      const { count: snapshotCount } = await supabase
        .from('field_customers_snapshot')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id);

      const { data: statusCounts } = await supabase
        .from('field_matching_results')
        .select('match_status')
        .eq('company_id', company_id);

      const counts = { AUTO_LINK: 0, REVIEW: 0, CREATE_NEW: 0, APPROVED: 0, REJECTED: 0 };
      for (const row of (statusCounts || [])) {
        const status = row.match_status as keyof typeof counts;
        if (status in counts) counts[status]++;
      }

      const { count: syncedCount } = await supabase
        .from('field_control_sync')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .in('entity_type', ['customer_matched', 'customer_gc']);

      return new Response(JSON.stringify({
        success: true,
        snapshot_count: snapshotCount || 0,
        matching_results: counts,
        synced_count: syncedCount || 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-match] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
