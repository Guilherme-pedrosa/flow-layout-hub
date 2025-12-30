import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Suggestion {
  id: string;
  payable_id: string;
  extrato_data: string;
  extrato_valor: number;
  extrato_descricao: string;
  extrato_cpf_cnpj: string;
  extrato_nome: string;
  extrato_chave_pix: string;
  confidence_score: number;
  match_reason: string;
  payable: {
    description: string;
    amount: number;
    recipient_name: string;
    recipient_document: string;
    pix_key: string;
  };
}

interface ReconciliationReviewProps {
  companyId: string;
}

export function ReconciliationReview({ companyId }: ReconciliationReviewProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [runningReconciliation, setRunningReconciliation] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadSuggestions();
    }
  }, [companyId]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reconciliation_suggestions")
        .select(`
          *,
          payable:payables(description, amount, recipient_name, recipient_document, pix_key)
        `)
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      setSuggestions((data as Suggestion[]) || []);
    } catch (error) {
      console.error("Erro ao carregar sugestões:", error);
      toast.error("Erro ao carregar sugestões de conciliação");
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setRunningReconciliation(true);
    try {
      const { data, error } = await supabase.functions.invoke("inter-conciliacao", {
        body: { company_id: companyId, dias_retroativos: 7 },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `Conciliação executada! ${data.data.auto_reconciled} automáticas, ${data.data.suggestions_created} sugestões criadas.`
        );
        loadSuggestions();
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro na conciliação:", error);
      toast.error("Erro ao executar conciliação");
    } finally {
      setRunningReconciliation(false);
    }
  };

  const handleApprove = async (suggestion: Suggestion) => {
    setProcessing(suggestion.id);
    try {
      // Marcar payable como pago
      const { error: updateError } = await supabase
        .from("payables")
        .update({
          is_paid: true,
          paid_at: suggestion.extrato_data,
          paid_amount: suggestion.extrato_valor,
          payment_status: "paid",
          reconciled_at: new Date().toISOString(),
          reconciliation_source: "manual",
        })
        .eq("id", suggestion.payable_id);

      if (updateError) throw updateError;

      // Atualizar sugestão
      const { error: suggestionError } = await supabase
        .from("reconciliation_suggestions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestion.id);

      if (suggestionError) throw suggestionError;

      toast.success("Conciliação aprovada com sucesso!");
      loadSuggestions();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro ao aprovar conciliação");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (suggestionId: string) => {
    setProcessing(suggestionId);
    try {
      const { error } = await supabase
        .from("reconciliation_suggestions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (error) throw error;

      toast.success("Sugestão rejeitada");
      loadSuggestions();
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      toast.error("Erro ao rejeitar sugestão");
    } finally {
      setProcessing(null);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-orange-100 text-orange-800 border-orange-300";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDocument = (doc: string) => {
    if (!doc) return "-";
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return doc;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sugestões de Conciliação</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSuggestions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={runReconciliation}
            disabled={runningReconciliation}
          >
            {runningReconciliation ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Executar Conciliação
          </Button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma sugestão pendente</p>
            <p className="text-sm mt-2">
              Execute a conciliação para verificar pagamentos no extrato bancário
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="overflow-hidden">
              <CardHeader className="py-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    Sugestão de Conciliação
                  </CardTitle>
                  <Badge className={`${getConfidenceColor(suggestion.confidence_score)} border`}>
                    {suggestion.confidence_score}% confiança
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.match_reason}</p>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Extrato Bancário */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-blue-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Extrato Bancário
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data:</span>
                        <span className="font-medium">
                          {suggestion.extrato_data
                            ? format(new Date(suggestion.extrato_data), "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(suggestion.extrato_valor)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium text-right max-w-[200px] truncate">
                          {suggestion.extrato_nome || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPF/CNPJ:</span>
                        <span className="font-mono">
                          {formatDocument(suggestion.extrato_cpf_cnpj)}
                        </span>
                      </div>
                      {suggestion.extrato_chave_pix && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chave PIX:</span>
                          <span className="font-mono text-xs">
                            {suggestion.extrato_chave_pix}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seta central em telas maiores */}
                  <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* Conta a Pagar */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-green-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-600"></span>
                      Conta a Pagar
                    </h4>
                    <div className="bg-green-50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descrição:</span>
                        <span className="font-medium text-right max-w-[200px] truncate">
                          {suggestion.payable?.description || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(suggestion.payable?.amount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium text-right max-w-[200px] truncate">
                          {suggestion.payable?.recipient_name || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPF/CNPJ:</span>
                        <span className="font-mono">
                          {formatDocument(suggestion.payable?.recipient_document || "")}
                        </span>
                      </div>
                      {suggestion.payable?.pix_key && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chave PIX:</span>
                          <span className="font-mono text-xs">
                            {suggestion.payable.pix_key}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(suggestion.id)}
                    disabled={processing === suggestion.id}
                  >
                    {processing === suggestion.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-1" />
                    )}
                    Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(suggestion)}
                    disabled={processing === suggestion.id}
                  >
                    {processing === suggestion.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Aprovar Conciliação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
