import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Clock, FileText, Users, PieChart, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Insight {
  icon: "alert" | "down" | "up" | "dollar" | "clock" | "file" | "users" | "chart";
  title: string;
  value?: string;
  description: string;
  color: "red" | "orange" | "green" | "blue" | "purple" | "yellow";
}

const COMPANY_ID = "e7b9c8a5-6d4f-4e3b-8c2a-1b5d9f7e6a3c";

export function FinancialAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && insights.length === 0 && !isLoadingInsights) {
      loadInitialInsights();
    }
  }, [isOpen]);

  const loadInitialInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Analise os dados financeiros e retorne EXATAMENTE 6 insights no formato JSON. Cada insight deve ter:
- icon: "alert" | "down" | "up" | "dollar" | "clock" | "file" | "users" | "chart"
- title: título curto (max 25 chars)
- value: valor ou número relevante (opcional, ex: "R$ 15.000" ou "3 itens" ou "12%")
- description: descrição breve (max 50 chars)
- color: "red" | "orange" | "green" | "blue" | "purple" | "yellow"

Foque em:
1. Contas vencidas ou próximas do vencimento
2. Pagamentos suspeitos ou duplicados
3. Fluxo de caixa (positivo ou negativo)
4. Concentração de fornecedores
5. Tendências de gastos
6. Oportunidades de economia

Responda APENAS com o JSON array, sem markdown ou explicações.` }],
            companyId: COMPANY_ID
          }),
        }
      );

      if (!response.ok) throw new Error("Erro ao carregar insights");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullText += content;
              } catch {}
            }
          }
        }
      }

      try {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setInsights(parsed.slice(0, 6));
        }
      } catch {
        setInsights(getDefaultInsights());
      }
    } catch (error) {
      console.error("Erro ao carregar insights:", error);
      setInsights(getDefaultInsights());
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const getDefaultInsights = (): Insight[] => [
    { icon: "alert", title: "Contas Vencidas", value: "Verificando...", description: "Analisando contas em atraso", color: "red" },
    { icon: "dollar", title: "Fluxo de Caixa", value: "Calculando...", description: "Projeção para 30 dias", color: "blue" },
    { icon: "users", title: "Fornecedores", value: "Analisando...", description: "Concentração de gastos", color: "purple" },
    { icon: "file", title: "Auditoria", value: "Pendente", description: "Clique para analisar", color: "orange" },
    { icon: "up", title: "Tendências", value: "Carregando...", description: "Análise de gastos", color: "green" },
    { icon: "chart", title: "DRE", value: "Disponível", description: "Demonstrativo de resultados", color: "yellow" }
  ];

  const streamChat = async (userMessages: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`;
    
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        companyId: COMPANY_ID 
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error("Limite de requisições excedido. Tente novamente em alguns segundos.");
      }
      if (resp.status === 402) {
        throw new Error("Créditos insuficientes. Adicione mais créditos ao workspace.");
      }
      throw new Error("Erro ao conectar com a IA");
    }

    return resp;
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await streamChat(newMessages);
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar mensagem");
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const getIconComponent = (icon: Insight["icon"], color: Insight["color"]) => {
    const colorClasses = {
      red: "text-red-500",
      orange: "text-orange-500",
      green: "text-emerald-500",
      blue: "text-blue-500",
      purple: "text-purple-500",
      yellow: "text-yellow-500"
    };

    const iconClass = cn("h-6 w-6", colorClasses[color]);

    switch (icon) {
      case "alert": return <AlertTriangle className={iconClass} />;
      case "down": return <TrendingDown className={iconClass} />;
      case "up": return <TrendingUp className={iconClass} />;
      case "dollar": return <DollarSign className={iconClass} />;
      case "clock": return <Clock className={iconClass} />;
      case "file": return <FileText className={iconClass} />;
      case "users": return <Users className={iconClass} />;
      case "chart": return <PieChart className={iconClass} />;
      default: return <Bot className={iconClass} />;
    }
  };

  const getBgColor = (color: Insight["color"]) => {
    const bgClasses = {
      red: "bg-red-500/10",
      orange: "bg-orange-500/10",
      green: "bg-emerald-500/10",
      blue: "bg-blue-500/10",
      purple: "bg-purple-500/10",
      yellow: "bg-yellow-500/10"
    };
    return bgClasses[color];
  };

  const handleInsightClick = (insight: Insight) => {
    const prompts: Record<string, string> = {
      "alert": "Liste todas as contas vencidas e em atraso, com valores e dias de atraso",
      "down": "Analise as despesas que estão em queda e explique as causas",
      "up": "Analise as tendências de gastos dos últimos meses",
      "dollar": "Faça uma projeção detalhada do fluxo de caixa para os próximos 30 dias",
      "clock": "Liste os pagamentos programados e próximos vencimentos",
      "file": "Audite os lançamentos recentes e identifique inconsistências ou erros",
      "users": "Analise a concentração de fornecedores e dependência de cada um",
      "chart": "Gere uma análise DRE simplificada com receitas, custos e despesas"
    };
    
    sendMessage(prompts[insight.icon] || `Detalhe sobre: ${insight.title}`);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-white/80 uppercase tracking-wider">Assistente Financeiro IA</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Assistente IA</h2>
            <p className="text-sm text-white/70">Análise financeira inteligente</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Insights em Tempo Real</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInsights([]);
                  loadInitialInsights();
                }}
                disabled={isLoadingInsights}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingInsights && "animate-spin")} />
              </Button>
            </div>
            
            {isLoadingInsights ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analisando dados financeiros...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {insights.map((insight, index) => (
                  <button
                    key={index}
                    onClick={() => handleInsightClick(insight)}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border border-border/50 transition-all hover:scale-[1.02] hover:shadow-md text-left",
                      getBgColor(insight.color)
                    )}
                  >
                    <div className="mb-2">
                      {getIconComponent(insight.icon, insight.color)}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{insight.title}</h4>
                    {insight.value && (
                      <p className="text-lg font-bold text-foreground">{insight.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">Ou faça uma pergunta personalizada:</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="mb-2 text-xs"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Voltar aos insights
            </Button>
            
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                      : "bg-muted"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/^### (.*$)/gm, '<h4 class="font-semibold mt-3 mb-1 text-base">$1</h4>')
                          .replace(/^## (.*$)/gm, '<h3 class="font-semibold mt-4 mb-2 text-lg">$1</h3>')
                          .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
                          .replace(/\n/g, '<br/>')
                      }} 
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre suas finanças..."
            disabled={isLoading}
            className="flex-1 rounded-full"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
