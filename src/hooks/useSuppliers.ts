/**
 * @deprecated Este hook está DEPRECADO. Use usePessoas() com filtro is_fornecedor = true.
 * 
 * Este arquivo agora é apenas um wrapper que redireciona para usePessoas
 * para manter compatibilidade com código legado.
 */
import { usePessoas, Pessoa, PessoaInsert } from "./usePessoas";

// Tipos legados para compatibilidade
export interface Supplier {
  id: string;
  company_id: string | null;
  tipo_pessoa: "PF" | "PJ";
  cpf_cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierInsert {
  company_id?: string;
  tipo_pessoa?: "PF" | "PJ";
  cpf_cnpj?: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
  is_active?: boolean;
}

export interface SupplierUpdate extends Partial<SupplierInsert> {
  id: string;
}

// Converter Pessoa para Supplier (formato legado)
function pessoaToSupplier(pessoa: Pessoa): Supplier {
  return {
    id: pessoa.id,
    company_id: pessoa.company_id,
    tipo_pessoa: pessoa.tipo_pessoa as "PF" | "PJ",
    cpf_cnpj: pessoa.cpf_cnpj,
    razao_social: pessoa.razao_social,
    nome_fantasia: pessoa.nome_fantasia,
    inscricao_estadual: pessoa.inscricao_estadual,
    inscricao_municipal: pessoa.inscricao_municipal,
    logradouro: pessoa.logradouro,
    numero: pessoa.numero,
    complemento: pessoa.complemento,
    bairro: pessoa.bairro,
    cidade: pessoa.cidade,
    estado: pessoa.estado,
    cep: pessoa.cep,
    telefone: pessoa.telefone,
    email: pessoa.email,
    observacoes: pessoa.observacoes_internas,
    is_active: pessoa.is_active,
    created_at: pessoa.created_at,
    updated_at: pessoa.updated_at,
  };
}

/**
 * @deprecated Use usePessoas() com filtro is_fornecedor = true
 */
export function useSuppliers() {
  console.warn("[DEPRECATED] useSuppliers está deprecado. Use usePessoas() com filtro is_fornecedor = true.");
  
  const {
    fornecedores,
    activeFornecedores,
    isLoadingFornecedores,
    createPessoa,
    updatePessoa,
    toggleStatus,
    getPessoaByCpfCnpj,
    refetch,
  } = usePessoas();

  // Converter para formato legado
  const suppliers = fornecedores.map(pessoaToSupplier);
  const activeSuppliers = activeFornecedores.map(pessoaToSupplier);

  // Wrapper para criar fornecedor
  const createSupplier = {
    mutateAsync: async (supplier: Omit<SupplierInsert, "company_id">) => {
      const pessoaData: PessoaInsert = {
        ...supplier,
        is_fornecedor: true,
        is_cliente: false,
        is_transportadora: false,
        is_colaborador: false,
        observacoes_internas: supplier.observacoes,
      };
      const result = await createPessoa.mutateAsync(pessoaData);
      return pessoaToSupplier(result);
    },
    isPending: createPessoa.isPending,
  };

  // Wrapper para atualizar fornecedor
  const updateSupplier = {
    mutateAsync: async ({ id, ...data }: SupplierUpdate) => {
      const pessoaData: Partial<PessoaInsert> = {
        ...data,
        observacoes_internas: data.observacoes,
      };
      const result = await updatePessoa.mutateAsync({ id, data: pessoaData });
      return pessoaToSupplier(result);
    },
    isPending: updatePessoa.isPending,
  };

  // Wrapper para toggle status
  const toggleSupplierStatus = {
    mutateAsync: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const result = await toggleStatus.mutateAsync({ id, is_active });
      return pessoaToSupplier(result);
    },
    isPending: toggleStatus.isPending,
  };

  // Wrapper para buscar por CNPJ
  const getSupplierByCnpj = async (cpfCnpj: string): Promise<Supplier | null> => {
    const pessoa = await getPessoaByCpfCnpj(cpfCnpj);
    if (pessoa && pessoa.is_fornecedor) {
      return pessoaToSupplier(pessoa);
    }
    return null;
  };

  return {
    suppliers,
    activeSuppliers,
    isLoading: isLoadingFornecedores,
    error: null,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
    getSupplierByCnpj,
    refetch,
  };
}
