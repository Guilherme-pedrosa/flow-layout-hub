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

    // Filter valid products
    const validProducts = products.filter(p => p.code && p.description);
    const invalidCount = products.length - validProducts.length;
    
    if (invalidCount > 0) {
      console.log(`[import-products] Skipping ${invalidCount} products without code/description`);
    }

    // Get all existing product codes in one query
    const productCodes = validProducts.map(p => p.code);
    console.log(`[import-products] Fetching existing products for ${productCodes.length} codes`);
    
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, code')
      .eq('company_id', company_id)
      .in('code', productCodes);

    if (fetchError) {
      console.error('[import-products] Error fetching existing products:', fetchError);
      throw new Error(`Failed to fetch existing products: ${fetchError.message}`);
    }

    // Create a map of existing products by code
    const existingMap = new Map<string, string>();
    (existingProducts || []).forEach(p => {
      existingMap.set(p.code, p.id);
    });

    console.log(`[import-products] Found ${existingMap.size} existing products to update`);

    // Separate products for update and insert
    const toUpdate: { id: string; data: any }[] = [];
    const toInsert: any[] = [];

    for (const product of validProducts) {
      const existingId = existingMap.get(product.code);
      const productData = {
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
      };

      if (existingId) {
        toUpdate.push({
          id: existingId,
          data: { ...productData, updated_at: new Date().toISOString() }
        });
      } else {
        toInsert.push({
          company_id,
          code: product.code,
          ...productData,
          is_active: true,
          min_stock: 0,
          max_stock: 0,
        });
      }
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as { code: string; error: string }[],
    };

    // Batch insert new products (in chunks of 500)
    const BATCH_SIZE = 500;
    if (toInsert.length > 0) {
      console.log(`[import-products] Inserting ${toInsert.length} new products in batches of ${BATCH_SIZE}`);
      
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError, data: insertedData } = await supabase
          .from('products')
          .insert(batch)
          .select('id');

        if (insertError) {
          console.error(`[import-products] Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
          batch.forEach(p => results.errors.push({ code: p.code, error: insertError.message }));
        } else {
          results.created += insertedData?.length || batch.length;
          console.log(`[import-products] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertedData?.length || batch.length} products`);
        }
      }
    }

    // Batch update existing products (in chunks of 100 due to individual updates)
    if (toUpdate.length > 0) {
      console.log(`[import-products] Updating ${toUpdate.length} existing products`);
      
      // For updates, we need to do them in parallel batches
      const UPDATE_BATCH_SIZE = 50;
      for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + UPDATE_BATCH_SIZE);
        
        const updatePromises = batch.map(async ({ id, data }) => {
          const { error } = await supabase
            .from('products')
            .update(data)
            .eq('id', id);
          
          if (error) {
            return { success: false, id, error: error.message };
          }
          return { success: true, id };
        });

        const updateResults = await Promise.all(updatePromises);
        
        for (const result of updateResults) {
          if (result.success) {
            results.updated++;
          } else {
            results.errors.push({ code: result.id, error: result.error || 'Unknown error' });
          }
        }
        
        console.log(`[import-products] Updated batch ${Math.floor(i / UPDATE_BATCH_SIZE) + 1}: ${batch.length} products`);
      }
    }

    console.log(`[import-products] Completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total_processed: products.length,
          valid_products: validProducts.length,
          created: results.created,
          updated: results.updated,
          errors: results.errors.length,
          skipped_invalid: invalidCount,
        },
        error_details: results.errors.slice(0, 50), // Limit error details to first 50
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
