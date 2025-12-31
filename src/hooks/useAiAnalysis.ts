import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export function useAiAnalysis(category?: string) {
  const { currentCompany } = useCompany();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const hasTriggered = useRef(false);

  const triggerAnalysis = useCallback(async () => {
    if (!currentCompany?.id || isAnalyzing) return;

    // Prevent multiple triggers
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    setIsAnalyzing(true);
    console.log('[useAiAnalysis] Triggering analysis for company:', currentCompany.id);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-and-generate-insights', {
        body: { 
          companyId: currentCompany.id,
          category,
        },
      });

      if (error) {
        console.error('[useAiAnalysis] Error:', error);
        return;
      }

      console.log('[useAiAnalysis] Analysis result:', data);
      setLastAnalysis(new Date());
    } catch (err) {
      console.error('[useAiAnalysis] Failed to trigger analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentCompany?.id, isAnalyzing, category]);

  // Auto-trigger on mount (once per session per category)
  useEffect(() => {
    if (!currentCompany?.id) return;

    // Check if we already analyzed recently (last 2 minutes per category)
    const storageKey = `ai_analysis_${currentCompany.id}_${category || 'all'}`;
    const lastRun = localStorage.getItem(storageKey);
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    if (lastRun && parseInt(lastRun) > twoMinutesAgo) {
      console.log('[useAiAnalysis] Skipping - analyzed recently');
      return;
    }

    // Delay to avoid blocking UI
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, Date.now().toString());
      triggerAnalysis();
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentCompany?.id, category, triggerAnalysis]);

  return {
    isAnalyzing,
    lastAnalysis,
    triggerAnalysis,
  };
}
