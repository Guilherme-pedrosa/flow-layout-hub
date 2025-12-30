import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, AlertTriangle, TrendingUp, FileSearch, Lightbulb, Loader2 } from "lucide-react";
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
  type: "info" | "warning" | "suggestion" | "success";
  message: string;
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
            messages: [{ role: "user", content: "Faça uma análise rápida e me dê 3-4 insights curtos sobre a situação financeira atual. Responda APENAS com um JSON array no formato: [{\"type\": \"info|warning|suggestion|success\", \"message\": \"texto curto de até 60 caracteres\"}]. Sem markdown, sem explicações, apenas o JSON." }],
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
          setInsights(parsed.slice(0, 4));
        }
      } catch {
        setInsights([
          { type: "info", message: "Analisando dados financeiros..." },
          { type: "suggestion", message: "Clique em 'Analisar' para insights detalhados" }
        ]);
      }
    } catch (error) {
      console.error("Erro ao carregar insights:", error);
      setInsights([
        { type: "warning", message: "Não foi possível carregar insights automáticos" }
      ]);
    } finally {
      setIsLoadingInsights(false);
    }
  };

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

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case "suggestion":
        return <Lightbulb className="h-5 w-5 text-blue-500 shrink-0" />;
      case "success":
        return <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary shrink-0" />;
    }
  };

  const getInsightBg = (type: Insight["type"]) => {
    switch (type) {
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "suggestion":
        return "bg-blue-500/10 border-blue-500/20";
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20";
      default:
        return "bg-primary/10 border-primary/20";
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium uppercase tracking-wider opacity-80">AI Assistant Panel</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mb-3">
            <Bot className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold">Assistente IA</h2>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {/* Insights Section */}
        {messages.length === 0 && (
          <div className="space-y-3">
            {isLoadingInsights ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              insights.map((insight, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    getInsightBg(insight.type)
                  )}
                >
                  <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                  <p className="text-sm text-foreground leading-relaxed">{insight.message}</p>
                </div>
              ))
            )}

            <div className="pt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ações Rápidas</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 justify-start"
                  onClick={() => sendMessage("Detecte possíveis fraudes ou movimentações suspeitas")}
                  disabled={isLoading}
                >
                  <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                  Fraudes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 justify-start"
                  onClick={() => sendMessage("Audite os lançamentos recentes e verifique inconsistências")}
                  disabled={isLoading}
                >
                  <FileSearch className="h-3 w-3 mr-1 text-amber-500" />
                  Auditar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 justify-start"
                  onClick={() => sendMessage("Analise os fornecedores e concentração de gastos")}
                  disabled={isLoading}
                >
                  <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                  Fornecedores
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 justify-start"
                  onClick={() => sendMessage("Faça uma projeção do fluxo de caixa para os próximos 30 dias")}
                  disabled={isLoading}
                >
                  <Sparkles className="h-3 w-3 mr-1 text-green-500" />
                  Fluxo Caixa
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-4">
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
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
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
                          .replace(/^### (.*$)/gm, '<h4 class="font-semibold mt-3 mb-1">$1</h4>')
                          .replace(/^## (.*$)/gm, '<h3 class="font-semibold mt-4 mb-2">$1</h3>')
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
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mb-2 text-xs"
            onClick={() => {
              setMessages([]);
              setInsights([]);
              loadInitialInsights();
            }}
          >
            ← Voltar aos insights
          </Button>
        )}
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
            placeholder="Pergunte algo..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
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
