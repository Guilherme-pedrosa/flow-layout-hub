import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Filter,
  Lightbulb,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";
import { AIBanner } from "@/components/shared";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
}

interface FinancialEntry {
  id: string;
  document_number: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  is_paid: boolean;
  entity_name?: string;
  type: 'receivable' | 'payable';
}

interface Suggestion {
  transaction_id: string;
  entries: {
    id: string;
    type: 'receivable' | 'payable';
    amount_used: number;
  }[];
  confidence_score: number;
  match_reasons: string[];
  match_type: string;
  total_matched: number;
  difference: number;
  transaction?: BankTransaction;
  financial_entries?: FinancialEntry[];
}

type ConfidenceLevel = 'all' | 'high' | 'medium' | 'low';

export function ReconciliationPanel() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [receivables, setReceivables] = useState<FinancialEntry[]>([]);
  const [payables, setPayables] = useState<FinancialEntry[]>([]);
  
  // Filtros
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Seleção para ação em lote
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // Confirmação individual
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      // Carregar transações não conciliadas
      const { data: txData } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_reconciled", false)
        .order("transaction_date", { ascending: false });

      setTransactions(txData || []);

      // Carregar contas a receber
      const { data: recData } = await supabase
        .from("accounts_receivable")
        .select("*, clientes(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .eq("is_paid", false)
        .is("reconciliation_id", null);

      setReceivables((recData || []).map(r => ({
        id: r.id,
        document_number: r.document_number,
        description: r.description,
        amount: r.amount,
        due_date: r.due_date,
        is_paid: r.is_paid || false,
        entity_name: (r.clientes as { nome_fantasia?: string; razao_social?: string })?.nome_fantasia || 
                     (r.clientes as { nome_fantasia?: string; razao_social?: string })?.razao_social || undefined,
        type: 'receivable' as const
      })));

      // Carregar contas a pagar
      const { data: payData } = await supabase
        .from("payables")
        .select("*, pessoas:supplier_id(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .eq("is_paid", false)
        .is("reconciliation_id", null);

      setPayables((payData || []).map(p => ({
        id: p.id,
        document_number: p.document_number,
        description: p.description,
        amount: p.amount,
        due_date: p.due_date,
        is_paid: p.is_paid || false,
        entity_name: (p.pessoas as { nome_fantasia?: string; razao_social?: string })?.nome_fantasia || 
                     (p.pessoas as { nome_fantasia?: string; razao_social?: string })?.razao_social || undefined,
        type: 'payable' as const
      })));

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!companyId) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("reconciliation-engine", {
        body: {
          company_id: companyId,
          include_low_confidence: true,
          max_suggestions: 100
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Enriquecer sugestões com dados das transações e títulos
        const enrichedSuggestions = (data.data.suggestions || []).map((s: Suggestion) => {
          const tx = transactions.find(t => t.id === s.transaction_id);
          const allEntries = [...receivables, ...payables];
          const entries = s.entries.map(e => allEntries.find(fe => fe.id === e.id)).filter(Boolean);
          
          return {
            ...s,
            transaction: tx,
            financial_entries: entries
          };
        });

        setSuggestions(enrichedSuggestions);
        setSelectedSuggestions(new Set());

        toast.success(
          `Análise concluída! ${data.data.summary.total_suggestions} sugestões encontradas.`,
          { description: `${data.data.summary.high_confidence} alta, ${data.data.summary.medium_confidence} média, ${data.data.summary.low_confidence} baixa confiança` }
        );
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error("Erro ao executar análise de conciliação");
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmSuggestion = async (suggestion: Suggestion) => {
    if (!companyId || !suggestion.transaction) return;
    setConfirmingId(suggestion.transaction_id);

    try {
      const tx = suggestion.transaction;
      const totalAmount = Math.abs(tx.amount);

      // 1. Criar registro de conciliação
      const { data: reconciliation, error: recError } = await supabase
        .from("bank_reconciliations")
        .insert({
          company_id: companyId,
          bank_transaction_id: tx.id,
          total_reconciled_amount: totalAmount,
          method: suggestion.confidence_score >= 95 ? 'ai_high' : suggestion.confidence_score >= 70 ? 'ai_medium' : 'ai_low',
          notes: confirmNotes || `Conciliação via IA (${suggestion.confidence_score}% confiança)`
        })
        .select()
        .single();

      if (recError) throw recError;

      // 2. Criar itens da conciliação
      const items = suggestion.entries.map(entry => ({
        reconciliation_id: reconciliation.id,
        financial_id: entry.id,
        financial_type: entry.type,
        amount_used: entry.amount_used
      }));

      const { error: itemsError } = await supabase
        .from("bank_reconciliation_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // 3. Atualizar transação bancária
      await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_with_id: reconciliation.id,
          reconciled_with_type: suggestion.entries.length > 1 ? 'MULTI' : 'SINGLE'
        })
        .eq("id", tx.id);

      // 4. Atualizar títulos financeiros
      for (const entry of suggestion.entries) {
        const table = entry.type === 'receivable' ? 'accounts_receivable' : 'payables';
        
        await supabase
          .from(table)
          .update({
            is_paid: true,
            paid_at: tx.transaction_date,
            paid_amount: entry.amount_used,
            reconciled_at: new Date().toISOString(),
            reconciliation_id: reconciliation.id,
            ...(entry.type === 'receivable' ? { bank_transaction_id: tx.id, payment_method: 'transferencia' } : { payment_method: 'transferencia' })
          })
          .eq("id", entry.id);
      }

      toast.success("Conciliação confirmada com sucesso!");
      
      // Remover sugestão da lista
      setSuggestions(prev => prev.filter(s => s.transaction_id !== suggestion.transaction_id));
      setConfirmNotes('');
      
      // Recarregar dados
      loadData();

    } catch (error) {
      console.error("Erro ao confirmar:", error);
      toast.error("Erro ao confirmar conciliação");
    } finally {
      setConfirmingId(null);
    }
  };

  const rejectSuggestion = (transactionId: string) => {
    setSuggestions(prev => prev.filter(s => s.transaction_id !== transactionId));
    toast.info("Sugestão descartada");
  };

  // Filtros
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      // Filtro de confiança
      if (confidenceFilter === 'high' && s.confidence_score < 95) return false;
      if (confidenceFilter === 'medium' && (s.confidence_score < 70 || s.confidence_score >= 95)) return false;
      if (confidenceFilter === 'low' && s.confidence_score >= 70) return false;

      // Filtro de tipo
      if (typeFilter === 'credit' && s.transaction?.type !== 'CREDIT') return false;
      if (typeFilter === 'debit' && s.transaction?.type !== 'DEBIT') return false;

      // Busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = s.transaction?.description?.toLowerCase().includes(term);
        const matchEntity = s.financial_entries?.some(e => e.entity_name?.toLowerCase().includes(term));
        if (!matchDesc && !matchEntity) return false;
      }

      return true;
    });
  }, [suggestions, confidenceFilter, typeFilter, searchTerm]);

  // Contadores
  const highCount = suggestions.filter(s => s.confidence_score >= 95).length;
  const mediumCount = suggestions.filter(s => s.confidence_score >= 70 && s.confidence_score < 95).length;
  const lowCount = suggestions.filter(s => s.confidence_score < 70).length;

  const getConfidenceBadge = (score: number) => {
    if (score >= 95) {
      return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> {score}%</Badge>;
    }
    if (score >= 70) {
      return <Badge className="bg-amber-500 text-white"><Lightbulb className="h-3 w-3 mr-1" /> {score}%</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" /> {score}%</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* AI Banner */}
      <AIBanner
        insights={[{
          id: 'reconciliation-info',
          message: 'A IA analisa padrões de valor, data, nome e identificadores para sugerir conciliações. Todas as sugestões requerem sua confirmação antes de serem aplicadas.',
          type: 'info'
        }]}
        context="Motor de Conciliação Inteligente"
      />

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Link2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alta Confiança</p>
                <p className="text-2xl font-bold text-green-600">{highCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Lightbulb className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Média Confiança</p>
                <p className="text-2xl font-bold text-amber-600">{mediumCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Baixa Confiança</p>
                <p className="text-2xl font-bold text-muted-foreground">{lowCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center justify-center">
            <Button 
              onClick={runAnalysis} 
              disabled={analyzing || loading}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v as ConfidenceLevel)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Confiança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta (≥95%)</SelectItem>
                <SelectItem value="medium">Média (70-94%)</SelectItem>
                <SelectItem value="low">Baixa (&lt;70%)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'credit' | 'debit')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="credit">Créditos</SelectItem>
                <SelectItem value="debit">Débitos</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Sugestões */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            {suggestions.length === 0 ? (
              <>
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Nenhuma sugestão disponível</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Analisar com IA" para gerar sugestões de conciliação
                </p>
                <Button onClick={runAnalysis} disabled={analyzing}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Análise
                </Button>
              </>
            ) : (
              <>
                <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Nenhuma sugestão encontrada com estes filtros</p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros para ver mais resultados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.transaction_id} className="overflow-hidden">
              <CardHeader className="py-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getConfidenceBadge(suggestion.confidence_score)}
                    <Badge variant="outline">
                      {suggestion.match_type === 'exact' ? 'Match Exato' :
                       suggestion.match_type === 'aggregation' ? 'Aglutinação' :
                       suggestion.match_type === 'partial' ? 'Parcial' : 'Match'}
                    </Badge>
                    {suggestion.entries.length > 1 && (
                      <Badge variant="secondary">
                        {suggestion.entries.length} títulos
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {suggestion.match_reasons.join(' • ')}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Layout Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Transação Bancária */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-primary">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Transação Bancária
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Data</span>
                        <span className="font-medium">{formatDate(suggestion.transaction?.transaction_date || '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Valor</span>
                        <span className={`text-xl font-bold ${suggestion.transaction?.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {suggestion.transaction?.type === 'CREDIT' ? '+' : '-'}
                          {formatCurrency(Math.abs(suggestion.transaction?.amount || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Descrição</span>
                        <span className="font-medium text-right max-w-[200px] truncate text-sm">
                          {suggestion.transaction?.description || '-'}
                        </span>
                      </div>
                      {suggestion.transaction?.nsu && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">NSU</span>
                          <span className="font-mono text-sm">{suggestion.transaction.nsu}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seta central em desktop */}
                  <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="p-2 rounded-full bg-background border shadow-sm">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Títulos Financeiros */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-600"></span>
                      {suggestion.entries[0]?.type === 'receivable' ? 'Conta(s) a Receber' : 'Conta(s) a Pagar'}
                    </h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-3">
                      {suggestion.financial_entries?.map((entry, idx) => (
                        <div key={entry.id} className={idx > 0 ? 'pt-3 border-t border-green-200 dark:border-green-800' : ''}>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Valor</span>
                            <span className="font-bold text-lg">{formatCurrency(entry.amount)}</span>
                          </div>
                          {entry.entity_name && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Cliente/Fornecedor</span>
                              <span className="font-medium text-sm text-right max-w-[180px] truncate">{entry.entity_name}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Vencimento</span>
                            <span className="text-sm">{formatDate(entry.due_date)}</span>
                          </div>
                          {entry.document_number && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Documento</span>
                              <span className="font-mono text-sm">{entry.document_number}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Diferença (se houver) */}
                      {Math.abs(suggestion.difference) >= 0.01 && (
                        <div className="pt-3 border-t border-green-200 dark:border-green-800">
                          <div className="flex justify-between text-amber-600">
                            <span className="text-sm font-medium">Diferença</span>
                            <span className="font-bold">{formatCurrency(suggestion.difference)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => rejectSuggestion(suggestion.transaction_id)}
                    disabled={confirmingId === suggestion.transaction_id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => confirmSuggestion(suggestion)}
                    disabled={confirmingId === suggestion.transaction_id}
                  >
                    {confirmingId === suggestion.transaction_id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Confirmar Conciliação
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