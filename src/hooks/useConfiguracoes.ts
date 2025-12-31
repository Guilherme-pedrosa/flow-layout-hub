import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useCompany as useCompanyContext } from "@/contexts/CompanyContext";

export type Company = Tables<"companies">;
export type CompanyInsert = TablesInsert<"companies">;
export type CompanyUpdate = TablesUpdate<"companies">;

export function useCompany() {
  const { currentCompany } = useCompanyContext();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCompany = async () => {
    if (!currentCompany?.id) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", currentCompany.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao carregar empresa",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCompany = async (id: string, data: CompanyUpdate) => {
    setLoading(true);
    try {
      const { data: updated, error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Registrar log de auditoria
      await logAudit("update", "company", id, data);

      toast({
        title: "Empresa atualizada",
        description: "Dados salvos com sucesso.",
      });

      return updated;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, fetchCompany, updateCompany };
}

export type SystemUser = Tables<"users">;
export type SystemUserInsert = TablesInsert<"users">;
export type SystemUserUpdate = TablesUpdate<"users">;

export function useSystemUsers() {
  const { currentCompany } = useCompanyContext();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*, companies(name)")
        .eq("company_id", currentCompany.id)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (data: SystemUserInsert) => {
    if (!currentCompany?.id) return null;
    setLoading(true);
    try {
      const { data: created, error } = await supabase
        .from("users")
        .insert({ ...data, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;

      await logAudit("create", "user", created.id, { name: data.name, email: data.email, role: data.role }, currentCompany.id);

      toast({
        title: "Usuário criado",
        description: "Usuário cadastrado com sucesso.",
      });

      return created;
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, data: SystemUserUpdate) => {
    setLoading(true);
    try {
      const { data: updated, error } = await supabase
        .from("users")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAudit("update", "user", id, data, currentCompany?.id);

      toast({
        title: "Usuário atualizado",
        description: "Dados salvos com sucesso.",
      });

      return updated;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    return updateUser(id, { is_active: isActive });
  };

  return { loading, fetchUsers, createUser, updateUser, toggleUserStatus };
}

export type AuditLog = Tables<"audit_logs">;

export function useAuditLogs() {
  const { currentCompany } = useCompanyContext();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async (limit = 100) => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, users(name)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { loading, fetchLogs };
}

// Função auxiliar para registrar logs de auditoria
async function logAudit(action: string, entity: string, entityId: string, metadata: any, companyId?: string) {
  try {
    if (!companyId) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: user?.id || null,
      action,
      entity,
      entity_id: entityId,
      metadata_json: metadata,
    });
  } catch (error) {
    console.error("Erro ao registrar log de auditoria:", error);
  }
}
