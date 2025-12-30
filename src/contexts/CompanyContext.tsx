import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  razao_social: string | null;
  logo_url: string | null;
  is_active: boolean | null;
}

interface UserCompany {
  id: string;
  company_id: string;
  role: string;
  is_default: boolean;
  company: Company;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: UserCompany[];
  isLoading: boolean;
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'erp_current_company_id';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompanies = useCallback(async () => {
    try {
      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Se não há usuário logado, buscar todas as empresas (para dev)
        const { data: allCompanies, error } = await supabase
          .from('companies')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        // Simular estrutura de UserCompany
        const simulated: UserCompany[] = (allCompanies || []).map((c, idx) => ({
          id: c.id,
          company_id: c.id,
          role: 'admin',
          is_default: idx === 0,
          company: c as Company,
        }));
        
        setCompanies(simulated);
        
        // Restaurar última empresa selecionada ou usar padrão
        const savedCompanyId = localStorage.getItem(STORAGE_KEY);
        const savedCompany = simulated.find(uc => uc.company_id === savedCompanyId);
        const defaultCompany = savedCompany || simulated.find(uc => uc.is_default) || simulated[0];
        
        if (defaultCompany) {
          setCurrentCompany(defaultCompany.company);
        }
        
        return;
      }

      // Buscar empresas do usuário via user_companies
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!userData) {
        setIsLoading(false);
        return;
      }

      const { data: userCompanies, error } = await supabase
        .from('user_companies')
        .select(`
          id,
          company_id,
          role,
          is_default,
          company:companies(*)
        `)
        .eq('user_id', userData.id);

      if (error) throw error;

      // Mapear para estrutura correta
      const mapped: UserCompany[] = (userCompanies || []).map((uc: any) => ({
        id: uc.id,
        company_id: uc.company_id,
        role: uc.role,
        is_default: uc.is_default,
        company: uc.company as Company,
      }));

      setCompanies(mapped);

      // Restaurar última empresa selecionada ou usar padrão
      const savedCompanyId = localStorage.getItem(STORAGE_KEY);
      const savedCompany = mapped.find(uc => uc.company_id === savedCompanyId);
      const defaultCompany = savedCompany || mapped.find(uc => uc.is_default) || mapped[0];

      if (defaultCompany) {
        setCurrentCompany(defaultCompany.company);
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as empresas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const switchCompany = useCallback(async (companyId: string) => {
    const userCompany = companies.find(uc => uc.company_id === companyId);
    if (userCompany) {
      setCurrentCompany(userCompany.company);
      localStorage.setItem(STORAGE_KEY, companyId);
      toast({
        title: 'Empresa alterada',
        description: `Você está agora em: ${userCompany.company.name}`,
      });
    }
  }, [companies, toast]);

  const refreshCompanies = useCallback(async () => {
    setIsLoading(true);
    await fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        isLoading,
        switchCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
