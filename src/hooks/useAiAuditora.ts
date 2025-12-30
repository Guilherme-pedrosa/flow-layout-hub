import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCreateAiInsight } from './useAiInsights';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

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
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface PayableAuditData {
  supplier_id?: string;
  supplier_name?: string;
  amount: number;
  due_date: string;
  description?: string;
  document_number?: string;
  payment_method_type?: string;
  boleto_barcode?: string;
  pix_key?: string;
}

interface SaleAuditData {
  client_id?: string;
  client_name?: string;
  products_total: number;
  services_total: number;
  freight_value: number;
  discount_value: number;
  discount_percent: number;
  total_value: number;
  payment_type: string;
  installments_count?: number;
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

export function useAiAuditora() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const { createInsight } = useCreateAiInsight();
  const [loading, setLoading] = useState(false);

  // Validar conta a pagar
  const auditPayable = useCallback(async (data: PayableAuditData): Promise<AuditResult> => {
    if (!companyId) {
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    }

    setLoading(true);
    const validations: AuditValidation[] = [];

    try {
      // 1. Verificar duplicidade
      const { data: duplicates } = await supabase
        .from('payables')
        .select('id, description, amount, due_date')
        .eq('company_id', companyId)
        .eq('amount', data.amount)
        .gte('due_date', new Date(new Date(data.due_date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lte('due_date', new Date(new Date(data.due_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (duplicates && duplicates.length > 0) {
        validations.push({
          field: 'amount',
          type: 'warning',
          message: `Possível duplicidade: ${duplicates.length} lançamento(s) com mesmo valor em datas próximas`,
          suggestion: `Verifique: ${duplicates.map(d => d.description || 'Sem descrição').join(', ')}`,
        });
      }

      // 2. Verificar valor muito alto comparado ao histórico
      const { data: avgPayable } = await supabase
        .from('payables')
        .select('amount')
        .eq('company_id', companyId)
        .eq('supplier_id', data.supplier_id || '');

      if (avgPayable && avgPayable.length > 5) {
        const avg = avgPayable.reduce((s, p) => s + Number(p.amount), 0) / avgPayable.length;
        if (data.amount > avg * 3) {
          validations.push({
            field: 'amount',
            type: 'warning',
            message: `Valor 3x acima da média histórica para este fornecedor (média: R$ ${avg.toFixed(2)})`,
            suggestion: 'Confirme se o valor está correto ou se é uma compra extraordinária',
          });
        }
      }

      // 3. Verificar data de vencimento no passado
      const today = new Date().toISOString().split('T')[0];
      if (data.due_date < today) {
        validations.push({
          field: 'due_date',
          type: 'warning',
          message: 'Data de vencimento está no passado',
          suggestion: 'Verifique se a data está correta ou se o lançamento já está vencido',
        });
      }

      // 4. Validar código de barras de boleto
      if (data.payment_method_type === 'boleto' && data.boleto_barcode) {
        if (data.boleto_barcode.length < 44) {
          validations.push({
            field: 'boleto_barcode',
            type: 'error',
            message: 'Código de barras inválido (mínimo 44 dígitos)',
          });
        }
      }

      // 5. Verificar chave PIX
      if (data.payment_method_type === 'pix' && !data.pix_key) {
        validations.push({
          field: 'pix_key',
          type: 'error',
          message: 'Chave PIX é obrigatória para pagamentos via PIX',
        });
      }

      // 6. Verificar fornecedor sem cadastro ativo
      if (data.supplier_id) {
        const { data: supplier } = await supabase
          .from('pessoas')
          .select('is_active, razao_social')
          .eq('id', data.supplier_id)
          .single();

        if (supplier && !supplier.is_active) {
          validations.push({
            field: 'supplier_id',
            type: 'warning',
            message: 'Fornecedor está inativo no cadastro',
            suggestion: 'Verifique se o fornecedor deve continuar ativo',
          });
        }
      }

      // Calcular score e risco
      const errorCount = validations.filter(v => v.type === 'error').length;
      const warningCount = validations.filter(v => v.type === 'warning').length;
      const score = Math.max(0, 100 - (errorCount * 30) - (warningCount * 10));
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (errorCount > 0) riskLevel = 'critical';
      else if (warningCount >= 2) riskLevel = 'high';
      else if (warningCount === 1) riskLevel = 'medium';

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

      return {
        valid: errorCount === 0,
        validations,
        score,
        riskLevel,
      };
    } catch (error) {
      console.error('Erro ao auditar conta a pagar:', error);
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    } finally {
      setLoading(false);
    }
  }, [companyId, createInsight]);

  // Validar venda
  const auditSale = useCallback(async (data: SaleAuditData): Promise<AuditResult> => {
    if (!companyId) {
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    }

    setLoading(true);
    const validations: AuditValidation[] = [];

    try {
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
          suggestion: 'Verifique se o frete está correto',
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
          message: 'Valor total da venda deve ser maior que zero',
        });
      }

      // 5. Verificar cliente sem cadastro
      if (!data.client_id) {
        validations.push({
          field: 'client_id',
          type: 'info',
          message: 'Venda sem cliente identificado',
          suggestion: 'Cadastrar cliente permite acompanhar histórico',
        });
      }

      // 6. Verificar parcelamento sem cliente
      if (data.payment_type === 'parcelado' && !data.client_id) {
        validations.push({
          field: 'payment_type',
          type: 'warning',
          message: 'Venda parcelada sem cliente cadastrado',
          suggestion: 'Recomendado cadastrar cliente para vendas a prazo',
        });
      }

      // Calcular score
      const errorCount = validations.filter(v => v.type === 'error').length;
      const warningCount = validations.filter(v => v.type === 'warning').length;
      const score = Math.max(0, 100 - (errorCount * 30) - (warningCount * 10));
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (errorCount > 0) riskLevel = 'critical';
      else if (warningCount >= 2) riskLevel = 'high';
      else if (warningCount === 1) riskLevel = 'medium';

      return {
        valid: errorCount === 0,
        validations,
        score,
        riskLevel,
      };
    } catch (error) {
      console.error('Erro ao auditar venda:', error);
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Validar produto
  const auditProduct = useCallback(async (data: ProductAuditData): Promise<AuditResult> => {
    if (!companyId) {
      return { valid: true, validations: [], score: 100, riskLevel: 'low' };
    }

    setLoading(true);
    const validations: AuditValidation[] = [];

    try {
      // 1. Verificar código duplicado
      const q1: SupabaseQuery = supabase.from('products').select('id').eq('company_id', companyId).eq('code', data.code).limit(1);
      const existingCode = (await q1).data;

      if (existingCode && existingCode.length > 0) {
        validations.push({
          field: 'code',
          type: 'error',
          message: 'Código já existe em outro produto',
        });
      }

      // 2. Verificar código de barras duplicado
      if (data.barcode) {
        const { data: existingBarcode } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', companyId)
          .eq('barcode', data.barcode)
          .limit(1);

        if (existingBarcode && existingBarcode.length > 0) {
          validations.push({
            field: 'barcode',
            type: 'error',
            message: 'Código de barras já existe em outro produto',
          });
        }
      }

      // 3. Verificar NCM não validado
      if (data.ncm && data.ncm.length !== 8) {
        validations.push({
          field: 'ncm',
          type: 'warning',
          message: 'NCM deve ter 8 dígitos',
          suggestion: 'Use a validação de NCM com IA para obter sugestões',
        });
      }

      // 4. Verificar estoque mínimo maior que máximo
      if (data.min_stock > data.max_stock && data.max_stock > 0) {
        validations.push({
          field: 'min_stock',
          type: 'error',
          message: 'Estoque mínimo não pode ser maior que o máximo',
        });
      }

      // 5. Verificar preço de compra zerado
      if (data.purchase_price <= 0) {
        validations.push({
          field: 'purchase_price',
          type: 'info',
          message: 'Preço de compra não informado',
          suggestion: 'Informar preço de compra permite calcular margem de lucro',
        });
      }

      // 6. Verificar margem negativa
      if (data.sale_price && data.purchase_price > 0 && data.sale_price < data.purchase_price) {
        const margin = ((data.sale_price - data.purchase_price) / data.purchase_price) * 100;
        validations.push({
          field: 'sale_price',
          type: 'error',
          message: `Margem negativa de ${margin.toFixed(1)}%`,
          suggestion: 'Preço de venda abaixo do custo resultará em prejuízo',
        });
      }

      // 7. Verificar descrição muito curta
      if (data.description.length < 5) {
        validations.push({
          field: 'description',
          type: 'warning',
          message: 'Descrição muito curta',
          suggestion: 'Uma descrição detalhada facilita a busca e identificação',
        });
      }

      // Calcular score
      const errorCount = validations.filter(v => v.type === 'error').length;
      const warningCount = validations.filter(v => v.type === 'warning').length;
      const score = Math.max(0, 100 - (errorCount * 30) - (warningCount * 10));
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (errorCount > 0) riskLevel = 'critical';
      else if (warningCount >= 2) riskLevel = 'high';
      else if (warningCount === 1) riskLevel = 'medium';

      return {
        valid: errorCount === 0,
        validations,
        score,
        riskLevel,
      };
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
