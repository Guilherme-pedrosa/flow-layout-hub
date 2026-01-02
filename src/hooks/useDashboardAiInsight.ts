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
      // Check if user is authenticated first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setInsight({
          id: 'no-session',
          type: 'info',
          title: 'Login necessário',
          description: 'Faça login para receber insights de IA personalizados.',
          confidence: 100,
          action: { label: 'Login', href: '/auth' },
          createdAt: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }

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
      
      ROTAS DISPONÍVEIS (use apenas estas):
      - /contas-pagar = lista de contas a pagar (use para ver pagamentos, fornecedores com concentração de gastos, vencimentos)
      - /contas-receber = lista de contas a receber (use para recebíveis, clientes em atraso)
      - /conciliacao = conciliação bancária
      - /financeiro = dashboard financeiro geral
      - /saldo-estoque = produtos em estoque
      - /pedidos-compra = pedidos de compra
      
      IMPORTANTE: Se identificar concentração de gastos em um fornecedor, a ação deve ser "Ver pagamentos" com rota "/contas-pagar" para ver os itens pagos a esse fornecedor, NÃO para cadastro de fornecedores.
      
      Responda APENAS com um JSON:
      {
        "type": "opportunity" | "warning" | "info",
        "title": "título curto (max 50 chars)",
        "description": "descrição detalhada (max 150 chars)",
        "confidence": número de 0-100,
        "actionLabel": "texto do botão (max 20 chars)",
        "actionHref": "rota relativa (use apenas as rotas listadas acima)"
      }`;

      // Use supabase.functions.invoke which handles auth automatically
      const { data: responseData, error: fnError } = await supabase.functions.invoke('financial-ai', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          companyId,
        },
      });

      if (fnError) throw fnError;

      // Handle response - can be streaming text or JSON object
      let fullText = '';
      
      if (typeof responseData === 'string') {
        fullText = responseData;
      } else if (responseData?.choices?.[0]?.message?.content) {
        fullText = responseData.choices[0].message.content;
      } else if (responseData?.error) {
        throw new Error(responseData.error);
      }

      // Remove markdown code blocks
      const cleanText = fullText
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setInsight({
          id: `ai-${Date.now()}`,
          type: parsed.type || 'info',
          title: parsed.title || 'Insight da IA',
          description: parsed.description || 'Analisando dados...',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 80,
          action: {
            label: parsed.actionLabel || 'Ver detalhes',
            href: parsed.actionHref || '/financeiro/contas-pagar',
          },
          createdAt: new Date().toISOString(),
        });
      } else {
        throw new Error('Resposta inválida da IA');
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
