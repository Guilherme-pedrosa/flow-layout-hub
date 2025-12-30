import { useState, useEffect } from "react";
import { Brain, ChevronRight, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FinancialAIBannerProps {
  type: "payables" | "receivables";
  onActionClick?: () => void;
}

export function FinancialAIBanner({ type, onActionClick }: FinancialAIBannerProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState<string>("Ver detalhes");
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Fetch company ID on mount
  useEffect(() => {
    const fetchCompanyId = async () => {
      const { data } = await supabase
        .from("inter_credentials")
        .select("company_id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      } else {
        // Fallback: try to get from payables
        const { data: payable } = await supabase
          .from("payables")
          .select("company_id")
          .limit(1)
          .maybeSingle();
        
        if (payable?.company_id) {
          setCompanyId(payable.company_id);
        } else {
          setIsLoading(false);
          setInsight("Configure as credenciais bancárias para análise IA");
        }
      }
    };
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadInsight();
    }
  }, [type, companyId]);

  const loadInsight = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    setIsDismissed(false);
    
    try {
      const prompt = type === "payables" 
        ? `Analise as contas a pagar e dê UM insight crítico e curto (máximo 100 caracteres) sobre:
           - Contas vencidas e valor total
           - Risco de inadimplência
           - Pagamentos duplicados
           Responda APENAS com um JSON: {"insight": "texto", "action": "texto do botão de ação (max 20 chars)"}
           Exemplo: {"insight": "R$45.000 em títulos vencidos há mais de 30 dias - risco de inadimplência", "action": "Ver vencidos"}`
        : `Analise as contas a receber e dê UM insight crítico e curto (máximo 100 caracteres) sobre:
           - Títulos vencidos e valor total
           - Clientes inadimplentes
           - Previsão de recebimentos
           Responda APENAS com um JSON: {"insight": "texto", "action": "texto do botão de ação (max 20 chars)"}
           Exemplo: {"insight": "R$45.000 em títulos vencidos há mais de 30 dias - risco de inadimplência", "action": "Acionar cobrança"}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            companyId: companyId
          }),
        }
      );

      if (!response.ok) throw new Error("Erro ao carregar insight");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let textBuffer = "";

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
              // JSON incompleto, continua
            }
          }
        }
      }

      // Remove markdown code blocks e extrai JSON
      const cleanText = fullText
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .replace(/\n/g, ' ')
        .trim();
      
      const jsonMatch = cleanText.match(/\{[^{}]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          setInsight(parsed.insight || "Análise concluída");
          setActionLabel(parsed.action || "Ver detalhes");
        } catch (e) {
          console.error("Erro parsing JSON:", e, jsonMatch[0]);
          setInsight("Verifique as contas pendentes e vencimentos");
        }
      } else {
        // Tenta extrair texto útil mesmo sem JSON
        const textOnly = cleanText.replace(/[{}"]/g, '').trim();
        if (textOnly.length > 10) {
          setInsight(textOnly.slice(0, 100));
        } else {
          setInsight("Verifique as contas pendentes e vencimentos");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar insight:", error);
      setInsight(type === "payables" 
        ? "Verifique contas vencidas e pagamentos pendentes" 
        : "Verifique títulos vencidos e recebimentos pendentes");
    } finally {
      setIsLoading(false);
    }
  };

  if (isDismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-6 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* AI Icon */}
          <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            {isLoading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Brain className="h-6 w-6 text-white" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">
              <span className="text-pink-400 font-semibold">IA identificou: </span>
              {isLoading ? (
                <span className="text-white/70">Analisando transações...</span>
              ) : (
                <span>{insight}</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadInsight}
            disabled={isLoading || !companyId}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          
          {!isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={onActionClick}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-1"
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDismissed(true)}
            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
