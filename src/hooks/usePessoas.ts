import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { useCompany } from "@/contexts/CompanyContext";

type TipoPessoa = Database["public"]["Enums"]["tipo_pessoa"];
type RegimeTributario = Database["public"]["Enums"]["regime_tributario"];
type TipoClienteComercial = Database["public"]["Enums"]["tipo_cliente_comercial"];
type ClienteStatus = Database["public"]["Enums"]["cliente_status"];

export interface Pessoa {
  id: string;
  company_id: string | null;
  tipo_pessoa: TipoPessoa;
  cpf_cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  regime_tributario: RegimeTributario | null;
  contribuinte_icms: boolean | null;
  retencao_impostos: boolean | null;
  cnae_principal: string | null;
  situacao_cadastral: string | null;
  data_abertura: string | null;
  observacoes_fiscais: string | null;
  tipo_cliente: TipoClienteComercial | null;
  limite_credito: number | null;
  condicao_pagamento: string | null;
  responsavel_comercial: string | null;
  observacoes_comerciais: string | null;
  responsavel_tecnico: string | null;
  sla_padrao: string | null;
  observacoes_internas: string | null;
  is_cliente: boolean;
  is_fornecedor: boolean;
  is_colaborador: boolean;
  is_transportadora: boolean;
  cargo: string | null;
  departamento: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  salario: number | null;
  comissao_percentual: number | null;
  auth_id: string | null;
  status: ClienteStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PessoaInsert {
  company_id?: string;
  tipo_pessoa?: TipoPessoa;
  cpf_cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  regime_tributario?: RegimeTributario;
  contribuinte_icms?: boolean;
  retencao_impostos?: boolean;
  cnae_principal?: string;
  situacao_cadastral?: string;
  data_abertura?: string;
  observacoes_fiscais?: string;
  tipo_cliente?: TipoClienteComercial;
  limite_credito?: number;
  condicao_pagamento?: string;
  responsavel_comercial?: string;
  observacoes_comerciais?: string;
  responsavel_tecnico?: string;
  sla_padrao?: string;
  observacoes_internas?: string;
  is_cliente?: boolean;
  is_fornecedor?: boolean;
  is_colaborador?: boolean;
  is_transportadora?: boolean;
  cargo?: string;
  departamento?: string;
  data_admissao?: string;
  data_demissao?: string;
  salario?: number;
  comissao_percentual?: number;
  auth_id?: string;
  status?: ClienteStatus;
  is_active?: boolean;
}

export interface PessoaContato {
  id: string;
  pessoa_id: string;
  nome: string | null;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  principal: boolean | null;
  created_at: string;
  updated_at: string;
}

export function usePessoas() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  // Query all pessoas
  const pessoasQuery = useQuery({
    queryKey: ["pessoas", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("pessoas")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data as Pessoa[];
    },
    enabled: !!currentCompany,
  });

  // Filtered queries by role
  const clientesQuery = useQuery({
    queryKey: ["pessoas", "clientes", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("pessoas")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_cliente", true)
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data as Pessoa[];
    },
    enabled: !!currentCompany,
  });

  const fornecedoresQuery = useQuery({
    queryKey: ["pessoas", "fornecedores", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("pessoas")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_fornecedor", true)
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data as Pessoa[];
    },
    enabled: !!currentCompany,
  });

  const colaboradoresQuery = useQuery({
    queryKey: ["pessoas", "colaboradores", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("pessoas")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_colaborador", true)
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data as Pessoa[];
    },
    enabled: !!currentCompany,
  });

  const transportadorasQuery = useQuery({
    queryKey: ["pessoas", "transportadoras", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("pessoas")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_transportadora", true)
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data as Pessoa[];
    },
    enabled: !!currentCompany,
  });

  // Create pessoa
  const createPessoa = useMutation({
    mutationFn: async (pessoa: PessoaInsert) => {
      if (!currentCompany) throw new Error("Nenhuma empresa selecionada");
      
      const { data, error } = await supabase
        .from("pessoas")
        .insert({ ...pessoa, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;
      return data as Pessoa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoas"] });
      toast.success("Cadastro criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar cadastro: ${error.message}`);
    },
  });

  // Update pessoa
  const updatePessoa = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PessoaInsert> }) => {
      const { data: result, error } = await supabase
        .from("pessoas")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as Pessoa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoas"] });
      toast.success("Cadastro atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cadastro: ${error.message}`);
    },
  });

  // Toggle status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("pessoas")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Pessoa;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pessoas"] });
      toast.success(data.is_active ? "Cadastro ativado!" : "Cadastro desativado!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Get pessoa by CPF/CNPJ
  const getPessoaByCpfCnpj = async (cpf_cnpj: string) => {
    if (!currentCompany) return null;
    
    const { data, error } = await supabase
      .from("pessoas")
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("cpf_cnpj", cpf_cnpj)
      .maybeSingle();

    if (error) throw error;
    return data as Pessoa | null;
  };

  // Get pessoa by ID
  const getPessoaById = async (id: string) => {
    const { data, error } = await supabase
      .from("pessoas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Pessoa;
  };

  // Get contatos
  const getContatos = async (pessoaId: string) => {
    const { data, error } = await supabase
      .from("pessoa_contatos")
      .select("*")
      .eq("pessoa_id", pessoaId)
      .order("principal", { ascending: false });

    if (error) throw error;
    return data as PessoaContato[];
  };

  // Filter helpers
  const pessoas = pessoasQuery.data ?? [];
  const clientes = clientesQuery.data ?? [];
  const fornecedores = fornecedoresQuery.data ?? [];
  const colaboradores = colaboradoresQuery.data ?? [];
  const transportadoras = transportadorasQuery.data ?? [];

  const activeClientes = clientes.filter((p) => p.is_active);
  const activeFornecedores = fornecedores.filter((p) => p.is_active);
  const activeColaboradores = colaboradores.filter((p) => p.is_active);
  const activeTransportadoras = transportadoras.filter((p) => p.is_active);

  return {
    // All pessoas
    pessoas,
    isLoading: pessoasQuery.isLoading,
    error: pessoasQuery.error,
    
    // Filtered by role
    clientes,
    fornecedores,
    colaboradores,
    transportadoras,
    
    // Active only
    activeClientes,
    activeFornecedores,
    activeColaboradores,
    activeTransportadoras,
    
    // Loading states
    isLoadingClientes: clientesQuery.isLoading,
    isLoadingFornecedores: fornecedoresQuery.isLoading,
    isLoadingColaboradores: colaboradoresQuery.isLoading,
    isLoadingTransportadoras: transportadorasQuery.isLoading,
    
    // Mutations
    createPessoa,
    updatePessoa,
    toggleStatus,
    
    // Helpers
    getPessoaByCpfCnpj,
    getPessoaById,
    getContatos,
    
    // Refetch
    refetch: () => {
      pessoasQuery.refetch();
      clientesQuery.refetch();
      fornecedoresQuery.refetch();
      colaboradoresQuery.refetch();
      transportadorasQuery.refetch();
    },
  };
}
