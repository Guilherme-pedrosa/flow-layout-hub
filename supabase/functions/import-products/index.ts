import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductImport {
  code: string;
  description: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  barcode?: string;
  unit?: string;
  ncm?: string;
  cest?: string;
  product_group?: string;
  gross_weight?: number;
  net_weight?: number;
  commission_percent?: number;
}

interface ImportRequest {
  products: ProductImport[];
  company_id: string;
  clear_existing: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { products, company_id, clear_existing }: ImportRequest = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'products array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[import-products] Starting import of ${products.length} products for company ${company_id}`);
    console.log(`[import-products] Clear existing: ${clear_existing}`);

    // If clear_existing is true, set quantity to 0 for all existing products
    if (clear_existing) {
      const { error: clearError } = await supabase
        .from('products')
        .update({ quantity: 0 })
        .eq('company_id', company_id)
        .eq('is_active', true);

      if (clearError) {
        console.error('[import-products] Error clearing existing stock:', clearError);
        throw new Error(`Failed to clear existing stock: ${clearError.message}`);
      }
      console.log('[import-products] Cleared existing stock for all products');
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as { code: string; error: string }[],
    };

    for (const product of products) {
      try {
        // Validate required fields
        if (!product.code || !product.description) {
          results.errors.push({ 
            code: product.code || 'unknown', 
            error: 'code and description are required' 
          });
          continue;
        }

        // Check if product exists by code
        const { data: existingProduct, error: findError } = await supabase
          .from('products')
          .select('id, quantity')
          .eq('company_id', company_id)
          .eq('code', product.code)
          .maybeSingle();

        if (findError) {
          console.error(`[import-products] Error finding product ${product.code}:`, findError);
          results.errors.push({ code: product.code, error: findError.message });
          continue;
        }

        if (existingProduct) {
          // Update existing product
          const { error: updateError } = await supabase
            .from('products')
            .update({
              description: product.description,
              purchase_price: product.purchase_price || 0,
              sale_price: product.sale_price || 0,
              quantity: product.quantity || 0,
              final_cost: product.purchase_price || 0,
              barcode: product.barcode || null,
              unit: product.unit || 'UN',
              ncm: product.ncm || null,
              cest: product.cest || null,
              product_group: product.product_group || null,
              gross_weight: product.gross_weight || null,
              net_weight: product.net_weight || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProduct.id);

          if (updateError) {
            console.error(`[import-products] Error updating product ${product.code}:`, updateError);
            results.errors.push({ code: product.code, error: updateError.message });
          } else {
            results.updated++;
          }
        } else {
          // Create new product
          const { error: insertError } = await supabase
            .from('products')
            .insert({
              company_id,
              code: product.code,
              description: product.description,
              purchase_price: product.purchase_price || 0,
              sale_price: product.sale_price || 0,
              quantity: product.quantity || 0,
              final_cost: product.purchase_price || 0,
              barcode: product.barcode || null,
              unit: product.unit || 'UN',
              ncm: product.ncm || null,
              cest: product.cest || null,
              product_group: product.product_group || null,
              gross_weight: product.gross_weight || null,
              net_weight: product.net_weight || null,
              is_active: true,
              min_stock: 0,
              max_stock: 0,
            });

          if (insertError) {
            console.error(`[import-products] Error creating product ${product.code}:`, insertError);
            results.errors.push({ code: product.code, error: insertError.message });
          } else {
            results.created++;
          }
        }
      } catch (productError) {
        console.error(`[import-products] Error processing product ${product.code}:`, productError);
        results.errors.push({ 
          code: product.code, 
          error: productError instanceof Error ? productError.message : 'Unknown error' 
        });
      }
    }

    console.log(`[import-products] Completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total_processed: products.length,
          created: results.created,
          updated: results.updated,
          errors: results.errors.length,
        },
        error_details: results.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-products] Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});