import { useState } from "react";
import {
  Brain,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Bell,
  Loader2,
  Shield,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWaiObserver } from "@/hooks/useWaiObserver";
import { useTopAlerts } from "@/hooks/useTopAlerts";
import { WaiObserverAlertCard } from "./WaiObserverAlertCard";

export function WaiObserverPanel() {
  const {
    isLoading,
    isAnalyzing,
    fetchAlerts,
    askQuestion,
    runEconomicAnalysis,
    markAsRead,
    dismissAlert,
    recordAction,
  } = useWaiObserver();

  const {
    topAlerts,
    strategicRisks,
    economicRisks,
    tacticalAttention,
    totalPotentialLoss,
    fetchTopAlerts,
    maxAlerts,
  } = useTopAlerts();

  const [isOpen, setIsOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [questionResponse, setQuestionResponse] = useState<string | null>(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const response = await askQuestion({ question });
    if (response) {
      if (response.response && !response.response.no_alert) {
        const r = response.response;
        // Formato econômico obrigatório
        setQuestionResponse(
          `📌 ${r.economic_reason || "Análise concluída"}\n` +
          (r.potential_loss ? `📉 Impacto: R$ ${r.potential_loss.toLocaleString("pt-BR")}\n` : "") +
          (r.margin_change_percent ? `🧮 Variação de margem: ${r.margin_change_percent.toFixed(1)}%\n` : "") +
          (r.recommendation ? `✅ ${r.recommendation}` : "")
        );
        fetchTopAlerts();
      } else {
        setQuestionResponse(response.response?.reason || response.reason || "✓ Sem problemas detectados.");
      }
    }
    setQuestion("");
  };

  const handleRefresh = async () => {
    await fetchAlerts();
    await fetchTopAlerts();
  };

  const handleAlertUpdated = () => {
    fetchTopAlerts();
  };

  return (
    <Card className="border-2 border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">WAI Observer AI</CardTitle>
                {topAlerts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {topAlerts.length}/{maxAlerts}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {strategicRisks.length > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {strategicRisks.length} estratégico{strategicRisks.length > 1 ? "s" : ""}
                  </Badge>
                )}
                {economicRisks.length > 0 && (
                  <Badge variant="outline" className="border-red-500 text-red-700 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {economicRisks.length}
                  </Badge>
                )}
                {tacticalAttention.length > 0 && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {tacticalAttention.length}
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
            {/* Resumo de perda potencial */}
            {totalPotentialLoss > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Perda Potencial Acumulada</p>
                  <p className="text-lg font-bold text-red-700">
                    R$ {totalPotentialLoss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-300" />
              </div>
            )}

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
                onClick={handleRefresh}
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

            {/* Resposta da pergunta - formato econômico */}
            {questionResponse && (
              <div className="p-3 bg-muted rounded-md border-l-4 border-primary">
                <pre className="text-sm whitespace-pre-wrap font-sans">{questionResponse}</pre>
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

            {/* Lista de alertas priorizados (máximo 7) */}
            {topAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="font-medium">Nenhum alerta ativo</p>
                <p className="text-sm">
                  A IA está observando sua operação em silêncio
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {/* Alertas estratégicos primeiro */}
                  {strategicRisks.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> DECISÃO ESTRATÉGICA NECESSÁRIA
                      </p>
                      {strategicRisks.map((alert) => (
                        <WaiObserverAlertCard
                          key={alert.id}
                          alert={alert}
                          onMarkRead={markAsRead}
                          onDismiss={dismissAlert}
                          onRecordAction={recordAction}
                          onAlertUpdated={handleAlertUpdated}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Riscos econômicos */}
                  {economicRisks.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> RISCO ECONÔMICO
                      </p>
                      {economicRisks.map((alert) => (
                        <WaiObserverAlertCard
                          key={alert.id}
                          alert={alert}
                          onMarkRead={markAsRead}
                          onDismiss={dismissAlert}
                          onRecordAction={recordAction}
                          onAlertUpdated={handleAlertUpdated}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Atenção tática */}
                  {tacticalAttention.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> ATENÇÃO
                      </p>
                      {tacticalAttention.map((alert) => (
                        <WaiObserverAlertCard
                          key={alert.id}
                          alert={alert}
                          onMarkRead={markAsRead}
                          onDismiss={dismissAlert}
                          onRecordAction={recordAction}
                          onAlertUpdated={handleAlertUpdated}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
