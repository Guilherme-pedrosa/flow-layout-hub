import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface AiInsight {
  id: string;
  company_id: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  category: 'financial' | 'stock' | 'sales' | 'fiscal' | 'audit' | 'opportunity' | 'purchases' | 'services' | 'system';
  mode: 'auditora' | 'cfo_bot' | 'especialista' | 'executora';
  title: string;
  message: string;
  action_label?: string | null;
  action_url?: string | null;
  action_data?: Record<string, unknown> | null;
  context?: string | null;
  priority: number;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export function useAiInsights(category?: string) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!companyId) {
      setInsights([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('ai_insights')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_dismissed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      
      console.log('[useAiInsights] Fetched insights:', data?.length, 'for company:', companyId);

      if (error) throw error;

      // Filter expired insights and cast to AiInsight
      const now = new Date().toISOString();
      const validInsights = (data || [])
        .filter((insight) => !insight.expires_at || insight.expires_at > now)
        .map((insight) => ({
          ...insight,
          type: insight.type as AiInsight['type'],
          category: insight.category as AiInsight['category'],
          mode: insight.mode as AiInsight['mode'],
        })) as AiInsight[];

      setInsights(validInsights);
      setUnreadCount(validInsights.filter((i) => !i.is_read).length);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, category]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Separate effect for realtime subscription to avoid reconnection loops
  useEffect(() => {
    if (!companyId) return;

    const channelName = `ai_insights_${companyId}${category ? `_${category}` : ''}_${Date.now()}`;
    let isSubscribed = true;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_insights',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (!isSubscribed) return;
          console.log('[useAiInsights] Realtime INSERT detected:', payload);
          if (!category || (payload.new as any)?.category === category) {
            fetchInsights();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_insights',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          if (!isSubscribed) return;
          fetchInsights();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useAiInsights] Realtime channel error - will retry');
        } else {
          console.log('[useAiInsights] Realtime subscription status:', status);
        }
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [companyId, category]);

  const markAsRead = useCallback(async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;
      
      setInsights(prev => 
        prev.map(i => i.id === insightId ? { ...i, is_read: true } : i)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  }, []);

  const dismiss = useCallback(async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', insightId);

      if (error) throw error;
      
      setInsights(prev => prev.filter(i => i.id !== insightId));
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('company_id', companyId)
        .eq('is_read', false);

      if (error) throw error;
      
      setInsights(prev => prev.map(i => ({ ...i, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all insights as read:', error);
    }
  }, [companyId]);

  return {
    insights,
    unreadCount,
    loading,
    markAsRead,
    dismiss,
    markAllAsRead,
    refetch: fetchInsights,
  };
}

// Hook para criar insights (usado pelos jobs e validações)
export function useCreateAiInsight() {
  const { currentCompany } = useCompany();

  const createInsight = useCallback(async (insight: {
    type: string;
    category: string;
    mode: string;
    title: string;
    message: string;
    action_label?: string;
    action_url?: string;
    action_data?: Record<string, unknown>;
    context?: string;
    priority?: number;
    expires_at?: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (!currentCompany?.id) {
      console.error('No company selected');
      return null;
    }

    try {
      const insertData = {
        type: insight.type,
        category: insight.category,
        mode: insight.mode,
        title: insight.title,
        message: insight.message,
        action_label: insight.action_label,
        action_url: insight.action_url,
        action_data: insight.action_data as any,
        context: insight.context,
        priority: insight.priority ?? 0,
        expires_at: insight.expires_at,
        metadata: insight.metadata as any,
        company_id: currentCompany.id,
      };

      const { data, error } = await supabase
        .from('ai_insights')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating AI insight:', error);
      return null;
    }
  }, [currentCompany?.id]);

  return { createInsight };
}
