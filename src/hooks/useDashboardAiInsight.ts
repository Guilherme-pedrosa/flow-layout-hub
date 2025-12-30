import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AiInsight } from '@/lib/types';

export function useDashboardAiInsight() {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsight = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Busca company_id
      const { data: credData } = await supabase
        .from('inter_credentials')
        .select('company_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const companyId = credData?.company_id;

      if (!companyId) {
        setInsight({
          id: 'no-company',
          type: 'info',
          title: 'Configuração pendente',
          description: 'Configure as credenciais bancárias para receber insights de IA.',
          confidence: 100,
          action: { label: 'Configurar', href: '/financeiro/configuracao-bancaria' },
          createdAt: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }

      const prompt = `Analise os dados financeiros e dê UM insight estratégico sobre oportunidades ou riscos do negócio.
      Responda APENAS com um JSON:
      {
        "type": "opportunity" | "warning" | "info",
        "title": "título curto (max 50 chars)",
        "description": "descrição detalhada (max 150 chars)",
        "confidence": número de 0-100,
        "actionLabel": "texto do botão (max 20 chars)",
        "actionHref": "rota relativa"
      }`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            companyId,
          }),
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar insight');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullText += content;
              } catch {}
            }
          }
        }
      }

      // Parse JSON da resposta
      const cleanText = fullText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setInsight({
          id: `ai-${Date.now()}`,
          type: parsed.type || 'info',
          title: parsed.title || 'Insight da IA',
          description: parsed.description || 'Analisando dados...',
          confidence: parsed.confidence || 80,
          action: {
            label: parsed.actionLabel || 'Ver detalhes',
            href: parsed.actionHref || '/financeiro',
          },
          createdAt: new Date().toISOString(),
        });
      } else {
        setInsight({
          id: `ai-${Date.now()}`,
          type: 'info',
          title: 'Análise em andamento',
          description: 'A IA está processando seus dados financeiros.',
          confidence: 50,
          action: { label: 'Ver finanças', href: '/financeiro' },
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err as Error);
      setInsight({
        id: 'error',
        type: 'warning',
        title: 'Erro na análise',
        description: 'Não foi possível gerar insights. Tente novamente.',
        confidence: 0,
        action: { label: 'Tentar novamente', href: '#' },
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  return { insight, isLoading, error, refetch: fetchInsight };
}
