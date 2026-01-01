import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Lightbulb,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
  Zap,
  Settings2,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";
import { AIBanner } from "@/components/shared";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RawData {
  nome?: string;
  nomePagador?: string;
  nomeRecebedor?: string;
  favorecido?: { nome?: string };
  pagador?: { nome?: string };
  [key: string]: unknown;
}

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  raw_data?: RawData | null;
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
  transaction: BankTransaction;
  entries: {
    id: string;
    type: 'receivable' | 'payable';
    amount: number;
    entity_name: string | null;
    due_date: string;
  }[];
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  match_reasons: string[];
  match_type: string;
  total_matched: number;
  difference: number;
  requires_review: boolean;
}

interface UnmatchedTransaction {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string | null;
}

type ViewMode = 'suggestions' | 'unmatched' | 'all';
type ConfidenceLevel = 'all' | 'high' | 'medium' | 'low';

export function ReconciliationPanel() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirmingBatch, setConfirmingBatch] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [receivables, setReceivables] = useState<FinancialEntry[]>([]);
  const [payables, setPayables] = useState<FinancialEntry[]>([]);
  
  // Filtros
  const [viewMode, setViewMode] = useState<ViewMode>('suggestions');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Seleção para ação em lote
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // Confirmação individual
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  
  // Configurações avançadas
  const [showConfig, setShowConfig] = useState(false);

  // Summary
  const [summary, setSummary] = useState({
    total_suggestions: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    unmatched: 0,
    transactions_analyzed: 0
  });

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

      setTransactions((txData || []).map(tx => ({
        ...tx,
        raw_data: tx.raw_data as RawData | null
      })));

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
          max_suggestions: 200
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSuggestions(data.data.suggestions || []);
        setUnmatchedTransactions(data.data.unmatched_transactions || []);
        setSummary(data.data.summary || {});
        setSelectedSuggestions(new Set());

        const { high_confidence, medium_confidence, low_confidence, unmatched } = data.data.summary;
        
        toast.success(
          `Análise concluída!`,
          { 
            description: `${high_confidence} alta, ${medium_confidence} média, ${low_confidence} baixa confiança. ${unmatched} sem match.`
          }
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
    if (!companyId) return;
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
          method: suggestion.confidence_level === 'high' ? 'ai_high' : 
                  suggestion.confidence_level === 'medium' ? 'ai_medium' : 'ai_low',
          notes: `Conciliação via IA (${suggestion.confidence_score}% - ${suggestion.match_reasons.join(', ')})`
        })
        .select()
        .single();

      if (recError) throw recError;

      // 2. Criar itens da conciliação
      const items = suggestion.entries.map(entry => ({
        reconciliation_id: reconciliation.id,
        financial_id: entry.id,
        financial_type: entry.type,
        amount_used: entry.amount
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
            paid_amount: entry.amount,
            reconciled_at: new Date().toISOString(),
            reconciliation_id: reconciliation.id,
            payment_method: 'transferencia'
          })
          .eq("id", entry.id);
      }

      toast.success("Conciliação confirmada!");
      
      // Remover sugestão da lista
      setSuggestions(prev => prev.filter(s => s.transaction_id !== suggestion.transaction_id));
      
      // Atualizar contadores
      setSummary(prev => ({
        ...prev,
        total_suggestions: prev.total_suggestions - 1,
        [suggestion.confidence_level === 'high' ? 'high_confidence' : 
         suggestion.confidence_level === 'medium' ? 'medium_confidence' : 'low_confidence']: 
          prev[suggestion.confidence_level === 'high' ? 'high_confidence' : 
               suggestion.confidence_level === 'medium' ? 'medium_confidence' : 'low_confidence'] - 1
      }));

    } catch (error) {
      console.error("Erro ao confirmar:", error);
      toast.error("Erro ao confirmar conciliação");
    } finally {
      setConfirmingId(null);
    }
  };

  const confirmBatchHighConfidence = async () => {
    const highConfidenceSuggestions = suggestions.filter(s => s.confidence_level === 'high');
    if (highConfidenceSuggestions.length === 0) {
      toast.info("Nenhuma sugestão de alta confiança para confirmar");
      return;
    }

    setConfirmingBatch(true);
    let successCount = 0;
    let errorCount = 0;

    for (const suggestion of highConfidenceSuggestions) {
      try {
        await confirmSuggestion(suggestion);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setConfirmingBatch(false);
    
    if (errorCount === 0) {
      toast.success(`${successCount} conciliações confirmadas com sucesso!`);
    } else {
      toast.warning(`${successCount} confirmadas, ${errorCount} com erro`);
    }

    loadData();
  };

  const rejectSuggestion = (transactionId: string) => {
    setSuggestions(prev => prev.filter(s => s.transaction_id !== transactionId));
    toast.info("Sugestão descartada");
  };

  // Filtros
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (confidenceFilter === 'high' && s.confidence_level !== 'high') return false;
      if (confidenceFilter === 'medium' && s.confidence_level !== 'medium') return false;
      if (confidenceFilter === 'low' && s.confidence_level !== 'low') return false;

      if (typeFilter === 'credit' && s.transaction?.amount <= 0) return false;
      if (typeFilter === 'debit' && s.transaction?.amount > 0) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = s.transaction?.description?.toLowerCase().includes(term);
        const matchEntity = s.entries?.some(e => e.entity_name?.toLowerCase().includes(term));
        if (!matchDesc && !matchEntity) return false;
      }

      return true;
    });
  }, [suggestions, confidenceFilter, typeFilter, searchTerm]);

  const getConfidenceBadge = (level: string, score: number) => {
    if (level === 'high') {
      return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> {score}% Alta</Badge>;
    }
    if (level === 'medium') {
      return <Badge className="bg-amber-500 text-white"><Lightbulb className="h-3 w-3 mr-1" /> {score}% Média</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" /> {score}% Baixa</Badge>;
  };

  const progressPercentage = transactions.length > 0 
    ? ((transactions.length - summary.unmatched) / transactions.length) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header com progresso estilo Kamino */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Conciliação Inteligente</h2>
              <p className="text-muted-foreground">
                {summary.total_suggestions > 0 
                  ? `${summary.total_suggestions} sugestões encontradas para revisão`
                  : 'Analise suas transações para encontrar correspondências'}
              </p>
            </div>
            <Button 
              onClick={runAnalysis} 
              disabled={analyzing || loading}
              size="lg"
              className="gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Analisar Transações
                </>
              )}
            </Button>
          </div>

          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da conciliação</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{transactions.length - summary.unmatched} conciliadas</span>
              <span>{summary.unmatched} pendentes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all ${viewMode === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setViewMode('all')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pendentes</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${confidenceFilter === 'high' && viewMode === 'suggestions' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
          onClick={() => { setViewMode('suggestions'); setConfidenceFilter('high'); }}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alta Confiança</p>
                <p className="text-2xl font-bold text-green-600">{summary.high_confidence}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${confidenceFilter === 'medium' && viewMode === 'suggestions' ? 'ring-2 ring-amber-500' : 'hover:bg-muted/50'}`}
          onClick={() => { setViewMode('suggestions'); setConfidenceFilter('medium'); }}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Lightbulb className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Média Confiança</p>
                <p className="text-2xl font-bold text-amber-600">{summary.medium_confidence}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${confidenceFilter === 'low' && viewMode === 'suggestions' ? 'ring-2 ring-gray-400' : 'hover:bg-muted/50'}`}
          onClick={() => { setViewMode('suggestions'); setConfidenceFilter('low'); }}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Baixa Confiança</p>
                <p className="text-2xl font-bold text-muted-foreground">{summary.low_confidence}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${viewMode === 'unmatched' ? 'ring-2 ring-red-500' : 'hover:bg-muted/50'}`}
          onClick={() => setViewMode('unmatched')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem Match</p>
                <p className="text-2xl font-bold text-red-600">{summary.unmatched}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ação em lote para alta confiança */}
      {summary.high_confidence > 0 && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCheck className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {summary.high_confidence} sugestões de alta confiança prontas
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Estas conciliações têm ≥90% de certeza e podem ser confirmadas em lote
                  </p>
                </div>
              </div>
              <Button 
                onClick={confirmBatchHighConfidence}
                disabled={confirmingBatch}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirmingBatch ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Confirmar Todas ({summary.high_confidence})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                <SelectItem value="high">Alta (≥90%)</SelectItem>
                <SelectItem value="medium">Média (70-89%)</SelectItem>
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
                placeholder="Buscar por descrição ou cliente..."
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

      {/* Conteúdo principal */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : viewMode === 'unmatched' ? (
        /* Lista de transações sem match */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Transações Sem Correspondência
            </CardTitle>
            <CardDescription>
              Estas transações não encontraram títulos correspondentes. Verifique se há lançamentos faltando.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unmatchedTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Todas as transações têm sugestões de correspondência!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unmatchedTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted">
                    <div className="flex items-center gap-4">
                      {tx.amount > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{tx.description || 'Sem descrição'}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                  Clique em "Analisar Transações" para gerar sugestões de conciliação
                </p>
                <Button onClick={runAnalysis} disabled={analyzing}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Análise
                </Button>
              </>
            ) : (
              <>
                <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Nenhuma sugestão com estes filtros</p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros para ver mais resultados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Lista de sugestões */
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.transaction_id} className="overflow-hidden">
              <CardHeader className="py-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getConfidenceBadge(suggestion.confidence_level, suggestion.confidence_score)}
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
                    {suggestion.match_reasons.slice(0, 3).join(' • ')}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Layout Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                  {/* Transação Bancária */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      {suggestion.transaction.amount > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      Transação Bancária
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Data</span>
                        <span className="font-medium">{formatDate(suggestion.transaction.transaction_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Valor</span>
                        <span className={`text-xl font-bold ${suggestion.transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {suggestion.transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(suggestion.transaction.amount)}
                        </span>
                      </div>
                      {(() => {
                        const rawData = suggestion.transaction.raw_data as RawData | null;
                        const remetente = rawData?.nome || 
                          rawData?.nomePagador || 
                          rawData?.nomeRecebedor || 
                          rawData?.favorecido?.nome || 
                          rawData?.pagador?.nome;
                        return remetente ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Remetente</span>
                            <span className="font-medium text-right max-w-[200px] truncate text-sm">
                              {remetente}
                            </span>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-sm">Descrição</span>
                        <span className="font-medium text-sm break-words">
                          {suggestion.transaction.description || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seta central */}
                  <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="p-2 rounded-full bg-background border shadow-sm">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Títulos Financeiros */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-primary">
                      <FileText className="h-4 w-4" />
                      {suggestion.entries[0]?.type === 'receivable' ? 'Conta(s) a Receber' : 'Conta(s) a Pagar'}
                    </h4>
                    <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                      {suggestion.entries.map((entry, idx) => (
                        <div key={entry.id} className={idx > 0 ? 'pt-3 border-t border-primary/20' : ''}>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Valor</span>
                            <span className="font-bold text-lg">{formatCurrency(entry.amount)}</span>
                          </div>
                          {entry.entity_name && (
                            <div className="flex flex-col gap-1">
                              <span className="text-muted-foreground text-sm">Cliente/Fornecedor</span>
                              <span className="font-medium text-sm break-words">{entry.entity_name}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Vencimento</span>
                            <span className="text-sm">{formatDate(entry.due_date)}</span>
                          </div>
                        </div>
                      ))}

                      {/* Diferença */}
                      {Math.abs(suggestion.difference) >= 0.01 && (
                        <div className="pt-3 border-t border-primary/20">
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
                    Confirmar
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
