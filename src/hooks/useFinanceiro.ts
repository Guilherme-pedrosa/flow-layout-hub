import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';

// Types
export type AccountType = 'ativo' | 'passivo' | 'patrimonio' | 'receita' | 'despesa' | 'custo';

export interface ChartOfAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: ChartOfAccount[];
}

export interface CostCenter {
  id: string;
  company_id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickCategory {
  id: string;
  company_id: string;
  name: string;
  chart_account_id: string | null;
  default_cost_center_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  chart_account?: ChartOfAccount;
  cost_center?: CostCenter;
}

export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper para logar em audit_logs
async function logAudit(action: string, entity: string, entityId: string, metadata: object, companyId?: string) {
  try {
    let cId = companyId;
    if (!cId) {
      const { data: companies } = await supabase.from('companies').select('id').limit(1);
      cId = companies?.[0]?.id;
    }
    if (!cId) return;

    await supabase.from('audit_logs').insert([{
      company_id: cId,
      action,
      entity,
      entity_id: entityId,
      metadata_json: metadata as unknown as import('@/integrations/supabase/types').Json,
    }]);
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
}

// Hook para Plano de Contas
export function useChartOfAccounts() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code');

      if (error) throw error;
      setAccounts((data as ChartOfAccount[]) || []);
      return data as ChartOfAccount[];
    } catch (error) {
      toast.error('Erro ao carregar plano de contas');
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buildTree = useCallback((flatAccounts: ChartOfAccount[]): ChartOfAccount[] => {
    const map = new Map<string, ChartOfAccount>();
    const roots: ChartOfAccount[] = [];

    flatAccounts.forEach(acc => {
      map.set(acc.id, { ...acc, children: [] });
    });

    flatAccounts.forEach(acc => {
      const node = map.get(acc.id)!;
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  const createAccount = useCallback(async (data: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('chart_of_accounts')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      
      await logAudit('create', 'chart_of_accounts', result.id, { name: data.name, code: data.code });
      toast.success('Conta criada com sucesso');
      return result as ChartOfAccount;
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        toast.error('Código já existe');
      } else {
        toast.error('Erro ao criar conta');
      }
      console.error(error);
      return null;
    }
  }, []);

  const updateAccount = useCallback(async (id: string, data: Partial<ChartOfAccount>) => {
    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await logAudit('update', 'chart_of_accounts', id, data);
      toast.success('Conta atualizada com sucesso');
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar conta');
      console.error(error);
      return false;
    }
  }, []);

  const toggleAccountStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateAccount(id, { is_active: isActive });
  }, [updateAccount]);

  return {
    accounts,
    loading,
    fetchAccounts,
    buildTree,
    createAccount,
    updateAccount,
    toggleAccountStatus,
  };
}

// Hook para Centros de Custo
export function useCostCenters() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCostCenters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .order('code');

      if (error) throw error;
      setCostCenters((data as CostCenter[]) || []);
      return data as CostCenter[];
    } catch (error) {
      toast.error('Erro ao carregar centros de custo');
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createCostCenter = useCallback(async (data: Omit<CostCenter, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('cost_centers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      
      await logAudit('create', 'cost_centers', result.id, { name: data.name, code: data.code });
      toast.success('Centro de custo criado com sucesso');
      return result as CostCenter;
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        toast.error('Código já existe');
      } else {
        toast.error('Erro ao criar centro de custo');
      }
      console.error(error);
      return null;
    }
  }, []);

  const updateCostCenter = useCallback(async (id: string, data: Partial<CostCenter>) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await logAudit('update', 'cost_centers', id, data);
      toast.success('Centro de custo atualizado com sucesso');
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar centro de custo');
      console.error(error);
      return false;
    }
  }, []);

  const toggleCostCenterStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateCostCenter(id, { is_active: isActive });
  }, [updateCostCenter]);

  return {
    costCenters,
    loading,
    fetchCostCenters,
    createCostCenter,
    updateCostCenter,
    toggleCostCenterStatus,
  };
}

// Hook para Categorias Rápidas
export function useQuickCategories() {
  const [categories, setCategories] = useState<QuickCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_categories')
        .select(`
          *,
          chart_account:chart_of_accounts(*),
          cost_center:cost_centers(*)
        `)
        .order('name');

      if (error) throw error;
      setCategories((data as unknown as QuickCategory[]) || []);
      return data as unknown as QuickCategory[];
    } catch (error) {
      toast.error('Erro ao carregar categorias rápidas');
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (data: Omit<QuickCategory, 'id' | 'created_at' | 'updated_at' | 'chart_account' | 'cost_center'>) => {
    try {
      const { data: result, error } = await supabase
        .from('quick_categories')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      
      await logAudit('create', 'quick_categories', result.id, { name: data.name });
      toast.success('Categoria criada com sucesso');
      return result as QuickCategory;
    } catch (error) {
      toast.error('Erro ao criar categoria');
      console.error(error);
      return null;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, data: Partial<QuickCategory>) => {
    try {
      const { error } = await supabase
        .from('quick_categories')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await logAudit('update', 'quick_categories', id, data);
      toast.success('Categoria atualizada com sucesso');
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
      console.error(error);
      return false;
    }
  }, []);

  const toggleCategoryStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateCategory(id, { is_active: isActive });
  }, [updateCategory]);

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    toggleCategoryStatus,
  };
}

// Hook para Contas Bancárias
export function useBankAccounts() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBankAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setBankAccounts((data as BankAccount[]) || []);
      return data as BankAccount[];
    } catch (error) {
      toast.error('Erro ao carregar contas bancárias');
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createBankAccount = useCallback(async (data: Omit<BankAccount, 'id' | 'created_at' | 'updated_at' | 'current_balance'>) => {
    try {
      const insertData = {
        ...data,
        current_balance: data.initial_balance,
      };
      
      const { data: result, error } = await supabase
        .from('bank_accounts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      await logAudit('create', 'bank_accounts', result.id, { name: data.name, bank_name: data.bank_name });
      toast.success('Conta bancária criada com sucesso');
      return result as BankAccount;
    } catch (error) {
      toast.error('Erro ao criar conta bancária');
      console.error(error);
      return null;
    }
  }, []);

  const updateBankAccount = useCallback(async (id: string, data: Partial<BankAccount>) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await logAudit('update', 'bank_accounts', id, data);
      toast.success('Conta bancária atualizada com sucesso');
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar conta bancária');
      console.error(error);
      return false;
    }
  }, []);

  const toggleBankAccountStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateBankAccount(id, { is_active: isActive });
  }, [updateBankAccount]);

  return {
    bankAccounts,
    loading,
    fetchBankAccounts,
    createBankAccount,
    updateBankAccount,
    toggleBankAccountStatus,
  };
}
