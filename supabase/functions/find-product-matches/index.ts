import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductMatch {
  id: string;
  code: string;
  description: string;
  score: number;
  matchType: 'exact_code' | 'normalized_code' | 'description_similarity';
}

// Normalize code: remove leading zeros, special characters, spaces
function normalizeCode(code: string): string {
  if (!code) return '';
  return code
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
    .replace(/^0+/, '') // Remove leading zeros
    .toUpperCase();
}

// Calculate text similarity using Levenshtein distance
function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(s1.length, s2.length);
  return Math.round((1 - matrix[s1.length][s2.length] / maxLen) * 100);
}

// Extract important keywords from description
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Common stop words in Portuguese
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'para', 'por', 'com', 'sem', 'a', 'o',
    'e', 'ou', 'que', 'se', 'ao', 'aos', 'as', 'os', 'p', 'c'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõöúçñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Calculate keyword match score
function keywordMatchScore(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  let matches = 0;
  for (const kw1 of keywords1) {
    for (const kw2 of keywords2) {
      // Check for exact match or if one contains the other
      if (kw1 === kw2 || kw1.includes(kw2) || kw2.includes(kw1)) {
        matches++;
        break;
      }
    }
  }
  
  // Calculate percentage of matching keywords
  const totalKeywords = Math.max(keywords1.length, keywords2.length);
  return Math.round((matches / totalKeywords) * 100);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo, descricao, companyId } = await req.json();
    
    if (!codigo && !descricao) {
      return new Response(
        JSON.stringify({ error: 'Código ou descrição são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const matches: ProductMatch[] = [];
    const normalizedInputCode = normalizeCode(codigo);
    const inputKeywords = extractKeywords(descricao);

    console.log(`[find-product-matches] Searching for code: "${codigo}", normalized: "${normalizedInputCode}"`);
    console.log(`[find-product-matches] Description keywords:`, inputKeywords);

    // 1. Search by exact code match
    if (codigo) {
      const { data: exactMatches } = await supabase
        .from('products')
        .select('id, code, description')
        .eq('code', codigo)
        .eq('is_active', true)
        .limit(1);

      if (exactMatches && exactMatches.length > 0) {
        console.log(`[find-product-matches] Found exact code match: ${exactMatches[0].code}`);
        matches.push({
          ...exactMatches[0],
          score: 100,
          matchType: 'exact_code'
        });
      }
    }

    // 2. Search by normalized code (if no exact match)
    if (matches.length === 0 && normalizedInputCode) {
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, code, description')
        .eq('is_active', true);

      if (allProducts) {
        for (const product of allProducts) {
          const normalizedProductCode = normalizeCode(product.code);
          
          // Check normalized code match
          if (normalizedProductCode === normalizedInputCode) {
            console.log(`[find-product-matches] Found normalized code match: ${product.code}`);
            matches.push({
              ...product,
              score: 95,
              matchType: 'normalized_code'
            });
          }
          // Check if one code contains the other
          else if (normalizedProductCode.includes(normalizedInputCode) || 
                   normalizedInputCode.includes(normalizedProductCode)) {
            const score = 85;
            matches.push({
              ...product,
              score,
              matchType: 'normalized_code'
            });
          }
        }
      }
    }

    // 3. Search by description similarity (if no code matches and we have keywords)
    if (matches.filter(m => m.score >= 90).length === 0 && inputKeywords.length > 0) {
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, code, description')
        .eq('is_active', true);

      if (allProducts) {
        const descriptionMatches: ProductMatch[] = [];
        
        for (const product of allProducts) {
          // Skip if already matched by code
          if (matches.some(m => m.id === product.id)) continue;
          
          const productKeywords = extractKeywords(product.description);
          const kwScore = keywordMatchScore(inputKeywords, productKeywords);
          
          // Also check Levenshtein for short descriptions
          const levScore = levenshteinSimilarity(descricao || '', product.description);
          
          // Use the higher of the two scores
          const finalScore = Math.max(kwScore, levScore);
          
          if (finalScore >= 50) {
            descriptionMatches.push({
              ...product,
              score: Math.min(finalScore, 90), // Cap at 90 for description matches
              matchType: 'description_similarity'
            });
          }
        }
        
        // Sort by score and take top 3
        descriptionMatches.sort((a, b) => b.score - a.score);
        matches.push(...descriptionMatches.slice(0, 3));
      }
    }

    // Sort all matches by score
    matches.sort((a, b) => b.score - a.score);
    
    // Remove duplicates and limit to 5
    const uniqueMatches = matches.reduce((acc: ProductMatch[], curr) => {
      if (!acc.some(m => m.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []).slice(0, 5);

    console.log(`[find-product-matches] Found ${uniqueMatches.length} matches`);

    return new Response(
      JSON.stringify({ matches: uniqueMatches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[find-product-matches] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
