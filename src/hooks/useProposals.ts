import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface Proposal {
  id: string;
  company_id: string;
  numero: string;
  data_emissao: string;
  data_validade: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_cnpj_cpf: string | null;
  cliente_endereco: string | null;
  cliente_contato: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  titulo: string;
  descricao_geral: string | null;
  valor_total: number;
  valor_desconto: number;
  valor_final: number;
  forma_pagamento: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  status: "rascunho" | "enviada" | "aprovada" | "rejeitada" | "expirada" | "cancelada";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  tipo: "produto" | "servico" | "plano";
  produto_id: string | null;
  servico_id: string | null;
  descricao: string;
  detalhes: string | null;
  centro_custo: string | null;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacao: string | null;
  ordem: number;
}

export interface ProposalSection {
  id: string;
  proposal_id: string;
  tipo: "institucional" | "missao_valores" | "parceiros" | "descricao" | "pagamento" | "termos" | "assinaturas" | "custom";
  titulo: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  ordem: number;
  habilitado: boolean;
}

export interface ProposalTerm {
  id: string;
  proposal_id: string;
  chave: string;
  titulo: string;
  conteudo: string;
  habilitado: boolean;
  ordem: number;
}

export interface ProposalImage {
  id: string;
  proposal_id: string;
  url: string;
  legenda: string | null;
  pagina_destino: string | null;
  ordem: number;
}

export interface ProposalCompanySettings {
  id: string;
  company_id: string;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string;
  secondary_color: string;
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  texto_institucional: string | null;
  missao: string | null;
  visao: string | null;
  valores: string | null;
  diferenciais: string | null;
  fornecimento_empresa: string | null;
  fornecimento_cliente: string | null;
  validade_dias_padrao: number;
  proximo_numero: number;
  prefixo_numero: string;
  nome_assinatura: string | null;
  cargo_assinatura: string | null;
}

export function useProposals() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // Listar propostas
  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!currentCompany?.id,
  });

  // Buscar proposta por ID
  const fetchProposal = async (id: string) => {
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Proposal;
  };

  // Buscar itens da proposta
  const fetchProposalItems = async (proposalId: string) => {
    const { data, error } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("ordem");

    if (error) throw error;
    return data as ProposalItem[];
  };

  // Buscar seções da proposta
  const fetchProposalSections = async (proposalId: string) => {
    const { data, error } = await supabase
      .from("proposal_sections")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("ordem");

    if (error) throw error;
    return data as ProposalSection[];
  };

  // Buscar termos da proposta
  const fetchProposalTerms = async (proposalId: string) => {
    const { data, error } = await supabase
      .from("proposal_terms")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("ordem");

    if (error) throw error;
    return data as ProposalTerm[];
  };

  // Buscar imagens da proposta
  const fetchProposalImages = async (proposalId: string) => {
    const { data, error } = await supabase
      .from("proposal_images")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("ordem");

    if (error) throw error;
    return data as ProposalImage[];
  };

  // Buscar configurações da empresa
  const fetchCompanySettings = async () => {
    if (!currentCompany?.id) return null;

    const { data, error } = await supabase
      .from("proposal_company_settings")
      .select("*")
      .eq("company_id", currentCompany.id)
      .maybeSingle();

    if (error) throw error;
    return data as ProposalCompanySettings | null;
  };

  // Criar proposta
  const createProposal = useMutation({
    mutationFn: async (data: Partial<Proposal>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // Verificar se usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[useProposals] Session check:", session ? `User: ${session.user.id}` : "NOT LOGGED IN");
      
      if (!session) {
        throw new Error("Você precisa estar logado para criar propostas");
      }

      // Gerar número da proposta
      const { data: numeroData, error: numeroError } = await supabase
        .rpc("generate_proposal_number", { p_company_id: currentCompany.id });

      if (numeroError) throw numeroError;

      const proposalData = {
        ...data,
        company_id: currentCompany.id,
        numero: numeroData,
        data_emissao: data.data_emissao || new Date().toISOString().split("T")[0],
        data_validade: data.data_validade || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        titulo: data.titulo || "Nova Proposta",
        status: "rascunho" as const,
      };

      const { data: proposal, error } = await supabase
        .from("proposals")
        .insert(proposalData)
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar proposta:", error);
      toast.error("Erro ao criar proposta");
    },
  });

  // Atualizar proposta
  const updateProposal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Proposal> & { id: string }) => {
      const { data: proposal, error } = await supabase
        .from("proposals")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return proposal as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar proposta:", error);
      toast.error("Erro ao atualizar proposta");
    },
  });

  // Excluir proposta
  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta excluída!");
    },
    onError: (error) => {
      console.error("Erro ao excluir proposta:", error);
      toast.error("Erro ao excluir proposta");
    },
  });

  // CRUD Itens
  const saveProposalItems = useMutation({
    mutationFn: async ({ proposalId, items }: { proposalId: string; items: Partial<ProposalItem>[] }) => {
      // Deletar itens existentes
      await supabase.from("proposal_items").delete().eq("proposal_id", proposalId);

      if (items.length === 0) return [];

      // Inserir novos itens - garantir campos obrigatórios
      const itemsData = items.map((item, index) => ({
        proposal_id: proposalId,
        tipo: item.tipo || "servico",
        descricao: item.descricao || "",
        detalhes: item.detalhes,
        centro_custo: item.centro_custo,
        unidade: item.unidade || "SV",
        quantidade: item.quantidade || 1,
        valor_unitario: item.valor_unitario || 0,
        observacao: item.observacao,
        ordem: index,
        produto_id: item.produto_id,
        servico_id: item.servico_id,
      }));

      const { data, error } = await supabase
        .from("proposal_items")
        .insert(itemsData)
        .select();

      if (error) throw error;
      return data as ProposalItem[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-items"] });
    },
  });

  // CRUD Termos
  const saveProposalTerms = useMutation({
    mutationFn: async ({ proposalId, terms }: { proposalId: string; terms: Partial<ProposalTerm>[] }) => {
      await supabase.from("proposal_terms").delete().eq("proposal_id", proposalId);

      if (terms.length === 0) return [];

      // Garantir campos obrigatórios
      const termsData = terms.map((term, index) => ({
        proposal_id: proposalId,
        chave: term.chave || `termo_${index}`,
        titulo: term.titulo || "Termo",
        conteudo: term.conteudo || "",
        habilitado: term.habilitado !== undefined ? term.habilitado : true,
        ordem: index,
      }));

      const { data, error } = await supabase
        .from("proposal_terms")
        .insert(termsData)
        .select();

      if (error) throw error;
      return data as ProposalTerm[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-terms"] });
    },
  });

  // CRUD Seções
  const saveProposalSections = useMutation({
    mutationFn: async ({ proposalId, sections }: { proposalId: string; sections: Partial<ProposalSection>[] }) => {
      await supabase.from("proposal_sections").delete().eq("proposal_id", proposalId);

      if (sections.length === 0) return [];

      // Garantir campos obrigatórios
      const sectionsData = sections.map((section, index) => ({
        proposal_id: proposalId,
        tipo: section.tipo || "custom",
        titulo: section.titulo,
        conteudo: section.conteudo,
        imagem_url: section.imagem_url,
        habilitado: section.habilitado !== undefined ? section.habilitado : true,
        ordem: index,
      }));

      const { data, error } = await supabase
        .from("proposal_sections")
        .insert(sectionsData)
        .select();

      if (error) throw error;
      return data as ProposalSection[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-sections"] });
    },
  });

  // Salvar configurações
  const saveCompanySettings = useMutation({
    mutationFn: async (settings: Partial<ProposalCompanySettings>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { data, error } = await supabase
        .from("proposal_company_settings")
        .upsert({
          ...settings,
          company_id: currentCompany.id,
        }, { onConflict: "company_id" })
        .select()
        .single();

      if (error) throw error;
      return data as ProposalCompanySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-settings"] });
      toast.success("Configurações salvas!");
    },
  });

  // Recalcular totais
  const recalculateTotals = async (proposalId: string) => {
    const items = await fetchProposalItems(proposalId);
    const valorTotal = items.reduce((sum, item) => sum + (item.valor_total || 0), 0);

    const { data: proposal } = await supabase
      .from("proposals")
      .select("valor_desconto")
      .eq("id", proposalId)
      .single();

    const valorDesconto = proposal?.valor_desconto || 0;
    const valorFinal = valorTotal - valorDesconto;

    await supabase
      .from("proposals")
      .update({ valor_total: valorTotal, valor_final: valorFinal })
      .eq("id", proposalId);

    queryClient.invalidateQueries({ queryKey: ["proposals"] });
  };

  return {
    proposals,
    isLoading,
    fetchProposal,
    fetchProposalItems,
    fetchProposalSections,
    fetchProposalTerms,
    fetchProposalImages,
    fetchCompanySettings,
    createProposal,
    updateProposal,
    deleteProposal,
    saveProposalItems,
    saveProposalTerms,
    saveProposalSections,
    saveCompanySettings,
    recalculateTotals,
  };
}

// Hook para usar dados completos de uma proposta
export function useProposalData(proposalId: string | undefined) {
  const {
    fetchProposal,
    fetchProposalItems,
    fetchProposalSections,
    fetchProposalTerms,
    fetchProposalImages,
    fetchCompanySettings,
  } = useProposals();

  const { data: proposal, isLoading: loadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId!),
    enabled: !!proposalId,
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["proposal-items", proposalId],
    queryFn: () => fetchProposalItems(proposalId!),
    enabled: !!proposalId,
  });

  const { data: sections, isLoading: loadingSections } = useQuery({
    queryKey: ["proposal-sections", proposalId],
    queryFn: () => fetchProposalSections(proposalId!),
    enabled: !!proposalId,
  });

  const { data: terms, isLoading: loadingTerms } = useQuery({
    queryKey: ["proposal-terms", proposalId],
    queryFn: () => fetchProposalTerms(proposalId!),
    enabled: !!proposalId,
  });

  const { data: images, isLoading: loadingImages } = useQuery({
    queryKey: ["proposal-images", proposalId],
    queryFn: () => fetchProposalImages(proposalId!),
    enabled: !!proposalId,
  });

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["proposal-settings"],
    queryFn: fetchCompanySettings,
  });

  return {
    proposal,
    items: items || [],
    sections: sections || [],
    terms: terms || [],
    images: images || [],
    settings,
    isLoading: loadingProposal || loadingItems || loadingSections || loadingTerms || loadingImages || loadingSettings,
  };
}
