import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCreateAiInsight } from './useAiInsights';

export type AuditValidationType = 'error' | 'warning' | 'info' | 'success';

export interface AuditValidation {
  field: string;
  type: AuditValidationType;
  message: string;
  suggestion?: string;
  autoFix?: () => void;
}

export interface AuditResult {
  valid: boolean;
  validations: AuditValidation[];
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface PayableAuditData {
  supplier_id?: string;
  amount: number;
  due_date: string;
  description?: string;
  payment_method_type?: string;
  boleto_barcode?: string;
  pix_key?: string;
}

interface SaleAuditData {
  client_id?: string;
  products_total: number;
  services_total: number;
  freight_value: number;
  discount_value: number;
  discount_percent: number;
  total_value: number;
  payment_type: string;
}

interface ProductAuditData {
  code: string;
  description: string;
  barcode?: string;
  ncm?: string;
  purchase_price: number;
  sale_price?: number;
  quantity: number;
  min_stock: number;
  max_stock: number;
}

function calculateRisk(validations: AuditValidation[]): { score: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' } {
  const errorCount = validations.filter(v => v.type === 'error').length;
  const warningCount = validations.filter(v => v.type === 'warning').length;
  const score = Math.max(0, 100 - (errorCount * 30) - (warningCount * 10));
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (errorCount > 0) riskLevel = 'critical';
  else if (warningCount >= 2) riskLevel = 'high';
  else if (warningCount === 1) riskLevel = 'medium';

  return { score, riskLevel };
}

export function useAiAuditora() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const { createInsight } = useCreateAiInsight();
  const [loading, setLoading] = useState(false);

  const auditPayable = useCallback(async (data: PayableAuditData): Promise<AuditResult> => {
    if (!companyId) {
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    }

    setLoading(true);
    const validations: AuditValidation[] = [];

    try {
      // 1. Verificar data de vencimento no passado
      const today = new Date().toISOString().split('T')[0];
      if (data.due_date < today) {
        validations.push({
          field: 'due_date',
          type: 'warning',
          message: 'Data de vencimento está no passado',
          suggestion: 'Verifique se a data está correta',
        });
      }

      // 2. Validar código de barras de boleto
      if (data.payment_method_type === 'boleto' && data.boleto_barcode) {
        if (data.boleto_barcode.length < 44) {
          validations.push({
            field: 'boleto_barcode',
            type: 'error',
            message: 'Código de barras inválido (mínimo 44 dígitos)',
          });
        }
      }

      // 3. Verificar chave PIX
      if (data.payment_method_type === 'pix' && !data.pix_key) {
        validations.push({
          field: 'pix_key',
          type: 'error',
          message: 'Chave PIX é obrigatória para pagamentos via PIX',
        });
      }

      // 4. Verificar valor muito baixo
      if (data.amount <= 0) {
        validations.push({
          field: 'amount',
          type: 'error',
          message: 'Valor deve ser maior que zero',
        });
      }

      const { score, riskLevel } = calculateRisk(validations);

      // Registrar insight se houver problemas críticos
      if (riskLevel === 'critical' || riskLevel === 'high') {
        await createInsight({
          type: riskLevel === 'critical' ? 'critical' : 'warning',
          category: 'financeiro',
          mode: 'auditora',
          title: 'Alerta de Auditoria - Conta a Pagar',
          message: validations.map(v => v.message).join('; '),
          context: data.description || 'Novo lançamento',
          priority: riskLevel === 'critical' ? 10 : 7,
        });
      }

      return { valid: validations.filter(v => v.type === 'error').length === 0, validations, score, riskLevel };
    } catch (error) {
      console.error('Erro ao auditar conta a pagar:', error);
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    } finally {
      setLoading(false);
    }
  }, [companyId, createInsight]);

  const auditSale = useCallback(async (data: SaleAuditData): Promise<AuditResult> => {
    const validations: AuditValidation[] = [];

    // 1. Verificar desconto muito alto
    if (data.discount_percent > 30) {
      validations.push({
        field: 'discount_percent',
        type: 'warning',
        message: `Desconto de ${data.discount_percent}% é muito alto`,
        suggestion: 'Descontos acima de 30% requerem aprovação gerencial',
      });
    }

    // 2. Verificar se frete é maior que produtos
    if (data.freight_value > data.products_total && data.products_total > 0) {
      validations.push({
        field: 'freight_value',
        type: 'warning',
        message: 'Valor do frete é maior que o valor dos produtos',
      });
    }

    // 3. Verificar venda sem produtos e sem serviços
    if (data.products_total === 0 && data.services_total === 0) {
      validations.push({
        field: 'products_total',
        type: 'error',
        message: 'Venda não possui produtos nem serviços',
      });
    }

    // 4. Verificar valor total zerado ou negativo
    if (data.total_value <= 0) {
      validations.push({
        field: 'total_value',
        type: 'error',
        message: 'Valor total deve ser maior que zero',
      });
    }

    // 5. Verificar parcelamento sem cliente
    if (data.payment_type === 'parcelado' && !data.client_id) {
      validations.push({
        field: 'payment_type',
        type: 'warning',
        message: 'Venda parcelada sem cliente cadastrado',
      });
    }

    const { score, riskLevel } = calculateRisk(validations);
    return { valid: validations.filter(v => v.type === 'error').length === 0, validations, score, riskLevel };
  }, []);

  const auditProduct = useCallback(async (data: ProductAuditData & { product_id?: string }): Promise<AuditResult> => {
    setLoading(true);
    const validations: AuditValidation[] = [];

    try {
      // 1. Verificar NCM
      if (data.ncm && data.ncm.length !== 8) {
        validations.push({
          field: 'ncm',
          type: 'warning',
          message: 'NCM deve ter 8 dígitos',
          suggestion: 'Use a validação de NCM com IA',
        });
      }

      // 2. Verificar estoque mínimo maior que máximo
      if (data.min_stock > data.max_stock && data.max_stock > 0) {
        validations.push({
          field: 'min_stock',
          type: 'error',
          message: 'Estoque mínimo não pode ser maior que o máximo',
        });
      }

      // 3. Verificar margem negativa
      if (data.sale_price && data.purchase_price > 0 && data.sale_price < data.purchase_price) {
        const margin = ((data.sale_price - data.purchase_price) / data.purchase_price) * 100;
        validations.push({
          field: 'sale_price',
          type: 'error',
          message: `Margem negativa de ${margin.toFixed(1)}%`,
          suggestion: 'Preço de venda abaixo do custo',
        });
      }

      // 4. Verificar descrição muito curta
      if (data.description.length < 5) {
        validations.push({
          field: 'description',
          type: 'warning',
          message: 'Descrição muito curta',
        });
      }

      // 5. Verificar código vazio
      if (!data.code) {
        validations.push({
          field: 'code',
          type: 'error',
          message: 'Código do produto é obrigatório',
        });
      }

      // 6. CRÍTICO: Verificar histórico de compras vs custo cadastrado
      if (data.product_id && companyId) {
        // Buscar últimas compras do produto
        const { data: purchaseItems } = await supabase
          .from('purchase_order_items')
          .select(`
            final_unit_cost,
            unit_price,
            freight_allocated,
            created_at,
            purchase_order:purchase_orders!inner(
              id,
              nfe_number,
              invoice_date,
              supplier_name,
              receipt_status
            )
          `)
          .eq('product_id', data.product_id)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (purchaseItems && purchaseItems.length > 0) {
          // Pegar o custo mais recente da última compra
          const lastPurchase = purchaseItems[0];
          const lastPurchaseCost = lastPurchase.final_unit_cost || 
            (lastPurchase.unit_price + (lastPurchase.freight_allocated || 0) / 
              ((lastPurchase as any).quantity || 1));
          
          // Comparar com o custo cadastrado
          if (lastPurchaseCost > 0 && data.purchase_price > 0) {
            const costDifference = Math.abs(lastPurchaseCost - data.purchase_price);
            const costDifferencePercent = (costDifference / lastPurchaseCost) * 100;
            
            // Se a diferença for maior que 5%, alertar
            if (costDifferencePercent > 5) {
              const purchaseOrder = lastPurchase.purchase_order as any;
              const nfeInfo = purchaseOrder?.nfe_number ? ` (NF-e ${purchaseOrder.nfe_number})` : '';
              
              if (data.purchase_price < lastPurchaseCost) {
                // Custo cadastrado é MENOR que a última compra - CRÍTICO
                validations.push({
                  field: 'purchase_price',
                  type: 'error',
                  message: `Custo cadastrado R$ ${data.purchase_price.toFixed(2)} está ${costDifferencePercent.toFixed(1)}% ABAIXO da última compra R$ ${lastPurchaseCost.toFixed(2)}${nfeInfo}`,
                  suggestion: `Última compra de ${purchaseOrder?.supplier_name || 'fornecedor'} em ${new Date(lastPurchase.created_at).toLocaleDateString('pt-BR')}. Custo deveria ser atualizado para R$ ${lastPurchaseCost.toFixed(2)}`,
                });
              } else {
                // Custo cadastrado é MAIOR que a última compra - warning
                validations.push({
                  field: 'purchase_price',
                  type: 'warning',
                  message: `Custo cadastrado R$ ${data.purchase_price.toFixed(2)} está ${costDifferencePercent.toFixed(1)}% ACIMA da última compra R$ ${lastPurchaseCost.toFixed(2)}${nfeInfo}`,
                  suggestion: `Verifique se houve aumento de preço ou se o custo cadastrado está incorreto`,
                });
              }
            }
          }

          // Verificar se há múltiplas compras com custos muito diferentes
          if (purchaseItems.length >= 2) {
            const costs = purchaseItems
              .map(item => item.final_unit_cost || item.unit_price)
              .filter(c => c > 0);
            
            if (costs.length >= 2) {
              const maxCost = Math.max(...costs);
              const minCost = Math.min(...costs);
              const variance = ((maxCost - minCost) / minCost) * 100;
              
              if (variance > 20) {
                validations.push({
                  field: 'purchase_price',
                  type: 'info',
                  message: `Variação de ${variance.toFixed(1)}% nos custos das últimas ${purchaseItems.length} compras (R$ ${minCost.toFixed(2)} a R$ ${maxCost.toFixed(2)})`,
                  suggestion: 'Considere negociar melhor com fornecedores ou padronizar as compras',
                });
              }
            }
          }
        } else {
          // Produto sem histórico de compras
          if (data.purchase_price === 0) {
            validations.push({
              field: 'purchase_price',
              type: 'warning',
              message: 'Produto sem custo de compra definido e sem histórico de compras',
              suggestion: 'Defina o custo de compra ou importe uma NF-e para atualizar automaticamente',
            });
          }
        }
      }

      const { score, riskLevel } = calculateRisk(validations);
      return { valid: validations.filter(v => v.type === 'error').length === 0, validations, score, riskLevel };
    } catch (error) {
      console.error('Erro ao auditar produto:', error);
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  return {
    loading,
    auditPayable,
    auditSale,
    auditProduct,
  };
}
