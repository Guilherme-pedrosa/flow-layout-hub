import { useState, useEffect } from "react";
import { Bot, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface AlertAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  alertTitle: string;
  alertSuggestion: string;
}

interface AnalysisData {
  resumo: string;
  causas: string[];
  impacto: string;
  acoes_recomendadas: { acao: string; prioridade: "alta" | "media" | "baixa" }[];
  projecao: string;
  conclusao: string;
}

export function AlertAnalysisModal({ open, onClose, alertTitle, alertSuggestion }: AlertAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyId = currentCompany?.id;

  useEffect(() => {
    if (open && companyId) {
      loadAnalysis();
    }
  }, [open, companyId]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke("financial-ai", {
        body: {
          messages: [{
            role: "user",
            content: `Analise detalhadamente este alerta financeiro:

ALERTA: "${alertTitle}"
SUGESTÃO INICIAL: "${alertSuggestion}"

Forneça uma análise completa em formato JSON com esta estrutura:
{
  "resumo": "Resumo executivo de 2-3 linhas sobre a situação",
  "causas": ["Lista de causas prováveis para este cenário"],
  "impacto": "Descrição do impacto no negócio se nada for feito",
  "acoes_recomendadas": [
    {"acao": "Descrição da ação", "prioridade": "alta|media|baixa"}
  ],
  "projecao": "Projeção para os próximos 30 dias",
  "conclusao": "Conclusão e próximos passos sugeridos"
}

Responda APENAS com o JSON, sem markdown ou explicações adicionais.`
          }],
          companyId: companyId,
          type: "analysis"
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const text = typeof response.data === "string" 
        ? response.data 
        : JSON.stringify(response.data);
      
      // Clean and parse JSON
      const cleanedText = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      
      const parsed = JSON.parse(cleanedText);
      setAnalysis(parsed);
    } catch (err) {
      console.error("Error loading analysis:", err);
      setError("Não foi possível carregar a análise. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: "alta" | "media" | "baixa") => {
    switch (priority) {
      case "alta":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Alta</Badge>;
      case "media":
        return <Badge className="bg-warning/10 text-warning border-warning/30">Média</Badge>;
      case "baixa":
        return <Badge className="bg-success/10 text-success border-success/30">Baixa</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            Análise Completa do Alerta
          </DialogTitle>
        </DialogHeader>

        {/* Alert Summary */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">{alertTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{alertSuggestion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analisando dados financeiros...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadAnalysis}>
              Tentar novamente
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                Resumo da Situação
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.resumo}</p>
            </div>

            {/* Causas */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Causas Identificadas
              </h3>
              <ul className="space-y-1">
                {analysis.causas.map((causa, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-1">•</span>
                    {causa}
                  </li>
                ))}
              </ul>
            </div>

            {/* Impacto */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 text-destructive mb-2">
                  <TrendingDown className="h-4 w-4" />
                  Impacto Potencial
                </h3>
                <p className="text-sm text-muted-foreground">{analysis.impacto}</p>
              </CardContent>
            </Card>

            {/* Ações Recomendadas */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-success" />
                Ações Recomendadas
              </h3>
              <div className="space-y-2">
                {analysis.acoes_recomendadas.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{item.acao}</span>
                    {getPriorityBadge(item.prioridade)}
                  </div>
                ))}
              </div>
            </div>

            {/* Projeção */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Projeção (30 dias)
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.projecao}</p>
            </div>

            {/* Conclusão */}
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 text-success mb-2">
                  <CheckCircle className="h-4 w-4" />
                  Conclusão
                </h3>
                <p className="text-sm text-muted-foreground">{analysis.conclusao}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
