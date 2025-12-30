import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface ProductGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSubgroup {
  id: string;
  company_id: string;
  group_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProductGroups() {
  const { currentCompany } = useCompany();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [subgroups, setSubgroups] = useState<ProductSubgroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_groups')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups((data as ProductGroup[]) || []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubgroups = async (groupId?: string) => {
    if (!currentCompany?.id) return;
    
    try {
      let query = supabase
        .from('product_subgroups')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubgroups((data as ProductSubgroup[]) || []);
    } catch (error) {
      console.error('Erro ao buscar subgrupos:', error);
    }
  };

  const createGroup = async (name: string, description?: string): Promise<ProductGroup | null> => {
    if (!currentCompany?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('product_groups')
        .insert({
          company_id: currentCompany.id,
          name: name.trim(),
          description: description?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um grupo com este nome');
        } else {
          throw error;
        }
        return null;
      }

      toast.success('Grupo criado com sucesso');
      await fetchGroups();
      return data as ProductGroup;
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      toast.error('Erro ao criar grupo');
      return null;
    }
  };

  const createSubgroup = async (groupId: string, name: string, description?: string): Promise<ProductSubgroup | null> => {
    if (!currentCompany?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('product_subgroups')
        .insert({
          company_id: currentCompany.id,
          group_id: groupId,
          name: name.trim(),
          description: description?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um subgrupo com este nome neste grupo');
        } else {
          throw error;
        }
        return null;
      }

      toast.success('Subgrupo criado com sucesso');
      await fetchSubgroups(groupId);
      return data as ProductSubgroup;
    } catch (error) {
      console.error('Erro ao criar subgrupo:', error);
      toast.error('Erro ao criar subgrupo');
      return null;
    }
  };

  const updateGroup = async (id: string, name: string, description?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('product_groups')
        .update({
          name: name.trim(),
          description: description?.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Grupo atualizado com sucesso');
      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error);
      toast.error('Erro ao atualizar grupo');
      return false;
    }
  };

  const updateSubgroup = async (id: string, name: string, description?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('product_subgroups')
        .update({
          name: name.trim(),
          description: description?.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Subgrupo atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar subgrupo:', error);
      toast.error('Erro ao atualizar subgrupo');
      return false;
    }
  };

  const deleteGroup = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('product_groups')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Grupo removido com sucesso');
      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Erro ao remover grupo:', error);
      toast.error('Erro ao remover grupo');
      return false;
    }
  };

  const deleteSubgroup = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('product_subgroups')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Subgrupo removido com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao remover subgrupo:', error);
      toast.error('Erro ao remover subgrupo');
      return false;
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchSubgroups();
  }, [currentCompany?.id]);

  return {
    groups,
    subgroups,
    loading,
    fetchGroups,
    fetchSubgroups,
    createGroup,
    createSubgroup,
    updateGroup,
    updateSubgroup,
    deleteGroup,
    deleteSubgroup,
  };
}
