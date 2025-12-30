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
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {
              // Incomplete JSON, continue
            }
          }
        }
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
