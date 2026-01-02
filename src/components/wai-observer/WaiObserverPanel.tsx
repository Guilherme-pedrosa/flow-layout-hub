import { useState } from "react";
import {
  Brain,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Bell,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWaiObserver } from "@/hooks/useWaiObserver";
import { WaiObserverAlertCard } from "./WaiObserverAlertCard";

export function WaiObserverPanel() {
  const {
    alerts,
    unreadCount,
    isLoading,
    isAnalyzing,
    fetchAlerts,
    askQuestion,
    runEconomicAnalysis,
    markAsRead,
    dismissAlert,
    recordAction,
  } = useWaiObserver();

  const [isOpen, setIsOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [questionResponse, setQuestionResponse] = useState<string | null>(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const response = await askQuestion({ question });
    if (response) {
      if (response.alert_generated) {
        setQuestionResponse(
          `⚠️ Problema detectado: ${response.alert?.economic_reason}`
        );
      } else {
        setQuestionResponse(response.reason || "Análise concluída sem alertas.");
      }
    }
    setQuestion("");
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <Card className="border-2 border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">WAI Observer AI</CardTitle>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} novo{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {criticalCount > 0 && (
                  <Badge variant="destructive">
                    {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                    {warningCount} atenção
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Barra de ações */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runEconomicAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-1" />
                )}
                Análise Econômica
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAlerts}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>
            </div>

            {/* Input de pergunta */}
            <div className="flex gap-2">
              <Input
                placeholder="Pergunte algo... ex: 'Essa OS está dando lucro?'"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                disabled={isAnalyzing}
              />
              <Button
                size="icon"
                onClick={handleAskQuestion}
                disabled={!question.trim() || isAnalyzing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Resposta da pergunta */}
            {questionResponse && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{questionResponse}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 text-xs"
                  onClick={() => setQuestionResponse(null)}
                >
                  Fechar
                </Button>
              </div>
            )}

            {/* Lista de alertas */}
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="font-medium">Nenhum alerta ativo</p>
                <p className="text-sm">
                  A IA está observando sua operação
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <WaiObserverAlertCard
                      key={alert.id}
                      alert={alert}
                      onMarkRead={markAsRead}
                      onDismiss={dismissAlert}
                      onRecordAction={recordAction}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
