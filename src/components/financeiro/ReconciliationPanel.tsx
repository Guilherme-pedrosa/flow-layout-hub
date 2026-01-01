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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Filter,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
}

interface MatchedEntry {
  id: string;
  type: 'receivable' | 'payable';
  amount: number;
  entity_name: string | null;
  due_date: string;
}

interface Suggestion {
  transaction_id: string;
  transaction: BankTransaction;
  entries: MatchedEntry[];
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  match_reasons: string[];
  match_type: 'rule' | 'exact_value_name' | 'exact_value_only' | 'nosso_numero';
  total_matched: number;
  difference: number;
  rule_id?: string;
  requires_review: boolean;
}

interface UnmatchedTransaction {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string | null;
}

interface ExtractRule {
  id: string;
  search_text: string;
  supplier_id: string | null;
  category_id: string | null;
  description: string | null;
  is_active: boolean;
  times_used: number;
}

interface Summary {
  total_suggestions: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  unmatched: number;
  transactions_analyzed: number;
  rules_active: number;
}

type ConfidenceLevel = 'all' | 'high' | 'medium' | 'low';

export function ReconciliationPanel() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([]);
  const [rules, setRules] = useState<ExtractRule[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_suggestions: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    unmatched: 0,
    transactions_analyzed: 0,
    rules_active: 0
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState("suggestions");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog para criar regra
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({ search_text: "", description: "" });
  const [transactionForRule, setTransactionForRule] = useState<UnmatchedTransaction | null>(null);
  
  // Confirmação
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadRules();
    }
  }, [companyId]);

  // Carregar regras de extrato
  const loadRules = async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await (supabase
        .from('extract_rules' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('times_used', { ascending: false }));

      if (!error && data) {
        setRules(data as unknown as ExtractRule[]);
      }
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    }
  };

  // Executar análise de conciliação
  const runAnalysis = async () => {
    if (!companyId) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("reconciliation-engine", {
        body: {
          company_id: companyId,
          max_suggestions: 100
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSuggestions(data.data.suggestions || []);
        setUnmatchedTransactions(data.data.unmatched_transactions || []);
        setSummary(data.data.summary || {});

        const s = data.data.summary;
        toast.success(
          `Análise concluída!`,
          { 
            description: `${s.high_confidence} alta, ${s.medium_confidence} média, ${s.low_confidence} baixa confiança. ${s.unmatched} exceções.` 
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

  // Confirmar conciliação individual
  const confirmSuggestion = async (suggestion: Suggestion) => {
    if (!companyId) return;
    setConfirmingId(suggestion.transaction_id);

    try {
      const tx = suggestion.transaction;

      // 1. Atualizar transação bancária como conciliada
      await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString()
        })
        .eq("id", tx.id);

      // 2. Atualizar títulos financeiros
      for (const entry of suggestion.entries) {
        const table = entry.type === 'receivable' ? 'accounts_receivable' : 'payables';
        
        await supabase
          .from(table)
          .update({
            is_paid: true,
            paid_at: tx.transaction_date,
            reconciliation_id: tx.id
          })
          .eq("id", entry.id);
      }

      // 3. Se foi match por regra, incrementar contador
      if (suggestion.rule_id) {
        await supabase.rpc('increment_rule_usage' as any, { rule_id: suggestion.rule_id });
      }

      toast.success("Conciliação confirmada!");
      
      // Remover da lista
      setSuggestions(prev => prev.filter(s => s.transaction_id !== suggestion.transaction_id));
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

  // Confirmar todas de alta confiança
  const confirmAllHighConfidence = async () => {
    const highConfidenceSuggestions = suggestions.filter(s => 
      s.confidence_level === 'high' && !s.requires_review
    );

    if (highConfidenceSuggestions.length === 0) {
      toast.info("Nenhuma sugestão de alta confiança para confirmar");
      return;
    }

    setAnalyzing(true);
    let confirmed = 0;

    for (const suggestion of highConfidenceSuggestions) {
      try {
        await confirmSuggestion(suggestion);
        confirmed++;
      } catch (error) {
        console.error(`Erro ao confirmar ${suggestion.transaction_id}:`, error);
      }
    }

    setAnalyzing(false);
    toast.success(`${confirmed} transações conciliadas em lote`);
  };

  // Descartar sugestão
  const rejectSuggestion = (transactionId: string) => {
    setSuggestions(prev => prev.filter(s => s.transaction_id !== transactionId));
    toast.info("Sugestão descartada");
  };

  // Criar regra de extrato
  const createRule = async () => {
    if (!companyId || !newRule.search_text.trim()) {
      toast.error("Texto de busca é obrigatório");
      return;
    }

    try {
      const { error } = await (supabase
        .from('extract_rules' as any)
        .insert({
          company_id: companyId,
          search_text: newRule.search_text.trim(),
          description: newRule.description.trim() || null,
          is_active: true,
          times_used: 0
        }));

      if (error) {
        if (error.code === '23505') {
          toast.error("Já existe uma regra com esse texto");
          return;
        }
        throw error;
      }

      toast.success(`Regra criada!`, {
        description: `Transações com "${newRule.search_text}" serão conciliadas automaticamente`
      });

      setShowRuleDialog(false);
      setNewRule({ search_text: "", description: "" });
      setTransactionForRule(null);
      loadRules();
      
      // Rodar análise novamente para aplicar nova regra
      runAnalysis();
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      toast.error("Erro ao criar regra");
    }
  };

  // Deletar regra
  const deleteRule = async (ruleId: string) => {
    try {
      await (supabase
        .from('extract_rules' as any)
        .delete())
        .eq('id', ruleId);

      toast.success("Regra removida");
      loadRules();
    } catch (error) {
      toast.error("Erro ao remover regra");
    }
  };

  // Abrir dialog para criar regra a partir de transação
  const openCreateRuleFromTransaction = (tx: UnmatchedTransaction) => {
    setTransactionForRule(tx);
    setNewRule({ 
      search_text: tx.description || "", 
      description: "" 
    });
    setShowRuleDialog(true);
  };

  // Filtrar sugestões
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (confidenceFilter === 'high' && s.confidence_level !== 'high') return false;
      if (confidenceFilter === 'medium' && s.confidence_level !== 'medium') return false;
      if (confidenceFilter === 'low' && s.confidence_level !== 'low') return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = s.transaction?.description?.toLowerCase().includes(term);
        const matchEntity = s.entries?.some(e => e.entity_name?.toLowerCase().includes(term));
        if (!matchDesc && !matchEntity) return false;
      }

      return true;
    });
  }, [suggestions, confidenceFilter, searchTerm]);

  // Calcular progresso
  const totalConciliado = summary.high_confidence + summary.medium_confidence + summary.low_confidence;
  const progressPercent = summary.transactions_analyzed > 0 
    ? Math.round((totalConciliado / summary.transactions_analyzed) * 100) 
    : 0;

  const getConfidenceBadge = (level: string, score: number) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> {score}%</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white"><Lightbulb className="h-3 w-3 mr-1" /> {score}%</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" /> {score}%</Badge>;
      default:
        return <Badge>{score}%</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all ${activeTab === 'suggestions' && confidenceFilter === 'high' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => { setActiveTab('suggestions'); setConfidenceFilter('high'); }}
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
          className={`cursor-pointer transition-all ${activeTab === 'suggestions' && confidenceFilter === 'medium' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => { setActiveTab('suggestions'); setConfidenceFilter('medium'); }}
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
          className={`cursor-pointer transition-all ${activeTab === 'suggestions' && confidenceFilter === 'low' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => { setActiveTab('suggestions'); setConfidenceFilter('low'); }}
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
          className={`cursor-pointer transition-all ${activeTab === 'unmatched' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setActiveTab('unmatched')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exceções</p>
                <p className="text-2xl font-bold text-red-600">{summary.unmatched}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${activeTab === 'rules' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Regras Ativas</p>
                <p className="text-2xl font-bold text-blue-600">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso */}
      {summary.transactions_analyzed > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso da Conciliação</span>
              <span className="text-sm text-muted-foreground">
                {totalConciliado} de {summary.transactions_analyzed} transações ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={runAnalysis} disabled={analyzing || loading}>
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analisar Transações
            </>
          )}
        </Button>
        
        {summary.high_confidence > 0 && (
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700" 
            onClick={confirmAllHighConfidence}
            disabled={analyzing}
          >
            <Check className="h-4 w-4 mr-2" />
            Confirmar Todas Alta Confiança ({summary.high_confidence})
          </Button>
        )}

        <Button variant="outline" onClick={() => setShowRuleDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suggestions">
            Sugestões ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            Exceções ({unmatchedTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="rules">
            Regras ({rules.length})
          </TabsTrigger>
        </TabsList>

        {/* Sugestões de conciliação */}
        <TabsContent value="suggestions" className="space-y-4">
          {/* Filtros */}
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
                <SelectItem value="medium">Média (60-89%)</SelectItem>
                <SelectItem value="low">Baixa (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredSuggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {suggestions.length === 0 ? (
                  <>
                    Nenhuma sugestão de conciliação encontrada.
                    <br />
                    Clique em "Analisar Transações" para buscar matches.
                  </>
                ) : (
                  "Nenhuma sugestão corresponde aos filtros selecionados."
                )}
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {filteredSuggestions.map((suggestion) => (
                  <Card key={suggestion.transaction_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Conteúdo principal */}
                        <div className="flex-1">
                          {/* Badges */}
                          <div className="flex items-center gap-2 mb-3">
                            {getConfidenceBadge(suggestion.confidence_level, suggestion.confidence_score)}
                            <Badge variant="outline">{suggestion.match_type}</Badge>
                            {suggestion.requires_review && (
                              <Badge variant="destructive">Requer Revisão</Badge>
                            )}
                          </div>
                          
                          {/* Grid lado a lado */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Transação bancária */}
                            <div className="border-r pr-4">
                              <p className="text-xs text-muted-foreground mb-1">Transação Bancária</p>
                              <p className="text-sm font-medium">
                                {formatDate(suggestion.transaction.transaction_date)}
                              </p>
                              <p className={`text-lg font-bold ${suggestion.transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(suggestion.transaction.amount)}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {suggestion.transaction.description}
                              </p>
                            </div>

                            {/* Título financeiro */}
                            <div className="pl-4">
                              <p className="text-xs text-muted-foreground mb-1">
                                {suggestion.entries.length > 0 
                                  ? `Título(s) a ${suggestion.entries[0]?.type === 'payable' ? 'Pagar' : 'Receber'}` 
                                  : 'Regra de Extrato'}
                              </p>
                              {suggestion.entries.length > 0 ? (
                                suggestion.entries.map((entry, idx) => (
                                  <div key={idx} className="mb-2">
                                    <p className="text-sm font-medium">{entry.entity_name || 'Sem nome'}</p>
                                    <p className="text-lg font-bold">{formatCurrency(entry.amount)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Venc: {formatDate(entry.due_date)}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">Conciliação por regra automática</p>
                              )}
                            </div>
                          </div>

                          {/* Motivos do match */}
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Motivos do match:</p>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.match_reasons.map((reason, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                            {suggestion.difference !== 0 && (
                              <p className="text-xs text-red-500 mt-1">
                                Diferença: {formatCurrency(suggestion.difference)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => confirmSuggestion(suggestion)}
                            disabled={confirmingId === suggestion.transaction_id}
                          >
                            {confirmingId === suggestion.transaction_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Confirmar
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => rejectSuggestion(suggestion.transaction_id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Descartar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Exceções (transações sem match) */}
        <TabsContent value="unmatched" className="space-y-4">
          {unmatchedTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma exceção encontrada. 
                {suggestions.length === 0 && " Clique em 'Analisar Transações' para começar."}
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {unmatchedTransactions.map((tx) => (
                  <Card key={tx.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tx.date)}
                          </p>
                          <p className={`text-lg font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(tx.amount)}
                          </p>
                          <p className="text-sm line-clamp-2">{tx.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openCreateRuleFromTransaction(tx)}
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Criar Regra
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Regras de extrato */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Regras de Extrato</CardTitle>
              <CardDescription>
                Funciona como PROCV do Excel: defina um texto a ser buscado na descrição do extrato 
                e a transação será categorizada automaticamente.
              </CardDescription>
            </CardHeader>
          </Card>

          {rules.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma regra de extrato criada.
                <br />
                Crie regras para automatizar a conciliação de transações recorrentes.
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-500" />
                            <p className="font-medium">"{rule.search_text}"</p>
                            {!rule.is_active && <Badge variant="secondary">Inativa</Badge>}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Usada {rule.times_used} vezes
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para criar regra */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Regra de Extrato</DialogTitle>
            <DialogDescription>
              Defina um texto a ser buscado nas descrições do extrato. 
              Transações que contiverem esse texto serão identificadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Texto a buscar *</Label>
              <Input 
                value={newRule.search_text}
                onChange={(e) => setNewRule(prev => ({ ...prev, search_text: e.target.value }))}
                placeholder="Ex: PIX ENVIADO - DANILO"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Funciona como PROCV do Excel - busca esse texto na descrição
              </p>
            </div>
            
            <div>
              <Label>Descrição (opcional)</Label>
              <Input 
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Pagamento ao Danilo - Frete"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRuleDialog(false);
              setNewRule({ search_text: "", description: "" });
              setTransactionForRule(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={createRule} disabled={!newRule.search_text.trim()}>
              <Zap className="h-4 w-4 mr-2" />
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
