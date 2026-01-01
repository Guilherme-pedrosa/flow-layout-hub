import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Undo2,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  ArrowRightLeft
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SuggestionEntry {
  id: string;
  type: 'receivable' | 'payable';
  amount: number;
  amount_used: number;
  entity_name: string | null;
  due_date: string;
  document_number?: string;
}

interface Suggestion {
  transaction_id: string;
  transaction: {
    id: string;
    transaction_date: string;
    description: string | null;
    amount: number;
    type: string | null;
  };
  entries: SuggestionEntry[];
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  match_reasons: string[];
  match_type: string;
  total_matched: number;
  difference: number;
  extracted_name?: string;
  matched_entity?: string;
}

interface UnmatchedTransaction {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string | null;
  extracted_name?: string;
}

interface FinancialEntry {
  id: string;
  amount: number;
  due_date: string;
  entity_name: string | null;
  document_number?: string;
  type: 'receivable' | 'payable';
  description?: string;
}

export function ReconciliationPanel() {
  const { toast } = useToast();
  const { currentCompany: selectedCompany } = useCompany();
  
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  
  const [selectedTransaction, setSelectedTransaction] = useState<UnmatchedTransaction | null>(null);
  const [availableEntries, setAvailableEntries] = useState<FinancialEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [confirmingBatch, setConfirmingBatch] = useState(false);
  
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  const loadSuggestions = async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconciliation-engine', {
        body: { company_id: selectedCompany.id }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setSuggestions(data.data.suggestions || []);
        setUnmatchedTransactions(data.data.unmatched_transactions || []);
        setSummary(data.data.summary || null);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sugestões",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.id) {
      loadSuggestions();
    }
  }, [selectedCompany?.id]);

  const confirmSuggestion = async (suggestion: Suggestion) => {
    try {
      const { data: reconciliation, error: recError } = await supabase
        .from('bank_reconciliations')
        .insert({
          company_id: selectedCompany?.id,
          bank_transaction_id: suggestion.transaction_id,
          total_reconciled_amount: suggestion.total_matched,
          difference: suggestion.difference,
          method: 'suggested',
          confidence_score: suggestion.confidence_score,
          match_type: suggestion.match_type
        })
        .select()
        .single();
      
      if (recError) throw recError;
      
      for (const entry of suggestion.entries) {
        await supabase
          .from('bank_reconciliation_items')
          .insert({
            reconciliation_id: reconciliation.id,
            financial_id: entry.id,
            financial_type: entry.type,
            amount_used: entry.amount_used,
            original_amount: entry.amount,
            entity_name: entry.entity_name,
            due_date: entry.due_date
          });
        
        const table = entry.type === 'receivable' ? 'accounts_receivable' : 'payables';
        await supabase
          .from(table)
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            reconciliation_id: reconciliation.id
          })
          .eq('id', entry.id);
      }
      
      await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString()
        })
        .eq('id', suggestion.transaction_id);
      
      toast({
        title: "Conciliação confirmada",
        description: `Transação conciliada com ${suggestion.entries.length} título(s)`,
      });
      
      loadSuggestions();
      
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const confirmBatch = async () => {
    const highConfidenceSuggestions = suggestions.filter(
      s => s.confidence_level === 'high' && selectedSuggestions.has(s.transaction_id)
    );
    
    if (highConfidenceSuggestions.length === 0) {
      toast({
        title: "Nenhuma sugestão selecionada",
        description: "Selecione sugestões de alta confiança para confirmar em lote",
        variant: "destructive"
      });
      return;
    }
    
    setConfirmingBatch(true);
    let confirmed = 0;
    let errors = 0;
    
    for (const suggestion of highConfidenceSuggestions) {
      try {
        await confirmSuggestion(suggestion);
        confirmed++;
      } catch {
        errors++;
      }
    }
    
    setConfirmingBatch(false);
    setSelectedSuggestions(new Set());
    
    toast({
      title: "Conciliação em lote",
      description: `${confirmed} confirmadas, ${errors} erros`,
    });
    
    loadSuggestions();
  };

  const discardSuggestion = (transactionId: string) => {
    setSuggestions(prev => prev.filter(s => s.transaction_id !== transactionId));
    toast({
      title: "Sugestão descartada",
      description: "A transação foi movida para exceções",
    });
  };

  const openManualSelection = async (transaction: UnmatchedTransaction) => {
    setSelectedTransaction(transaction);
    setSelectedEntries(new Set());
    setManualDialogOpen(true);
    setLoadingEntries(true);
    
    try {
      const isDebit = transaction.amount < 0;
      const table = isDebit ? 'payables' : 'accounts_receivable';
      const entityTable = isDebit ? 'pessoas' : 'clientes';
      const entityField = isDebit ? 'supplier_id' : 'customer_id';
      
      const { data, error } = await supabase
        .from(table)
        .select(`*, ${entityTable}:${entityField}(razao_social, nome_fantasia)`)
        .eq('company_id', selectedCompany?.id)
        .eq('is_paid', false)
        .is('reconciliation_id', null)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      const entries: FinancialEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        amount: item.amount,
        due_date: item.due_date,
        entity_name: item[entityTable]?.nome_fantasia || item[entityTable]?.razao_social || null,
        document_number: item.document_number,
        type: isDebit ? 'payable' : 'receivable',
        description: item.description
      }));
      
      setAvailableEntries(entries);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar títulos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingEntries(false);
    }
  };

  const calculateSelectedTotal = () => {
    return availableEntries
      .filter(e => selectedEntries.has(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const confirmManualSelection = async () => {
    if (!selectedTransaction || selectedEntries.size === 0) return;
    
    const txAmount = Math.abs(selectedTransaction.amount);
    const selectedTotal = calculateSelectedTotal();
    const difference = Math.abs(txAmount - selectedTotal);
    
    if (difference > 0.01) {
      toast({
        title: "Diferença de valores",
        description: `Diferença de R$ ${difference.toFixed(2)}. Ajuste a seleção.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      const entries = availableEntries.filter(e => selectedEntries.has(e.id));
      
      const { data: reconciliation, error: recError } = await supabase
        .from('bank_reconciliations')
        .insert({
          company_id: selectedCompany?.id,
          bank_transaction_id: selectedTransaction.id,
          total_reconciled_amount: selectedTotal,
          difference: difference,
          method: 'manual',
          match_type: entries.length > 1 ? 'aggregation_1_n' : 'exact_1_1'
        })
        .select()
        .single();
      
      if (recError) throw recError;
      
      for (const entry of entries) {
        await supabase
          .from('bank_reconciliation_items')
          .insert({
            reconciliation_id: reconciliation.id,
            financial_id: entry.id,
            financial_type: entry.type,
            amount_used: entry.amount,
            original_amount: entry.amount,
            entity_name: entry.entity_name,
            due_date: entry.due_date
          });
        
        const table = entry.type === 'receivable' ? 'accounts_receivable' : 'payables';
        await supabase
          .from(table)
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            reconciliation_id: reconciliation.id
          })
          .eq('id', entry.id);
      }
      
      await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString()
        })
        .eq('id', selectedTransaction.id);
      
      toast({
        title: "Conciliação manual confirmada",
        description: `Transação conciliada com ${entries.length} título(s)`,
      });
      
      setManualDialogOpen(false);
      loadSuggestions();
      
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (filterConfidence !== 'all' && s.confidence_level !== filterConfidence) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesDesc = s.transaction.description?.toLowerCase().includes(search);
      const matchesEntity = s.matched_entity?.toLowerCase().includes(search);
      const matchesName = s.extracted_name?.toLowerCase().includes(search);
      if (!matchesDesc && !matchesEntity && !matchesName) return false;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBatchSelection = (id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllHighConfidence = () => {
    const highIds = suggestions.filter(s => s.confidence_level === 'high').map(s => s.transaction_id);
    setSelectedSuggestions(new Set(highIds));
  };

  const getConfidenceBadge = (level: string, score: number) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />{score}% Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" />{score}% Média</Badge>;
      case 'low':
        return <Badge className="bg-red-500 hover:bg-red-600"><AlertTriangle className="w-3 h-3 mr-1" />{score}% Baixa</Badge>;
      default:
        return <Badge>{score}%</Badge>;
    }
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case 'exact_1_1':
        return <Badge variant="outline"><ArrowRightLeft className="w-3 h-3 mr-1" />1:1</Badge>;
      case 'aggregation_1_n':
        return <Badge variant="outline"><Layers className="w-3 h-3 mr-1" />1:N</Badge>;
      case 'nosso_numero':
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Nosso Nº</Badge>;
      case 'rule':
        return <Badge variant="outline"><Filter className="w-3 h-3 mr-1" />Regra</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-accent" onClick={() => setFilterConfidence('all')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{summary?.total_suggestions || 0}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent border-green-500" onClick={() => setFilterConfidence('high')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary?.high_confidence || 0}</div>
            <div className="text-sm text-muted-foreground">Alta Confiança</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent border-yellow-500" onClick={() => setFilterConfidence('medium')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary?.medium_confidence || 0}</div>
            <div className="text-sm text-muted-foreground">Média</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent border-red-500" onClick={() => setFilterConfidence('low')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary?.low_confidence || 0}</div>
            <div className="text-sm text-muted-foreground">Baixa</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent border-gray-500">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{summary?.unmatched || 0}</div>
            <div className="text-sm text-muted-foreground">Exceções</div>
          </CardContent>
        </Card>
      </div>

      {summary && summary.transactions_analyzed > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progresso da conciliação</span>
              <span>{Math.round(((summary.total_suggestions) / summary.transactions_analyzed) * 100)}%</span>
            </div>
            <Progress value={((summary.total_suggestions) / summary.transactions_analyzed) * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{summary.total_suggestions} sugestões</span>
              <span>{summary.transactions_analyzed} transações analisadas</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Buscar por descrição, fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            
            <Select value={filterConfidence} onValueChange={setFilterConfidence}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Confiança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta confiança</SelectItem>
                <SelectItem value="medium">Média confiança</SelectItem>
                <SelectItem value="low">Baixa confiança</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={loadSuggestions} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            {selectedSuggestions.size > 0 && (
              <Button onClick={confirmBatch} disabled={confirmingBatch}>
                <Check className="w-4 h-4 mr-2" />
                Confirmar {selectedSuggestions.size} selecionadas
              </Button>
            )}
          </div>
          
          {summary?.high_confidence > 0 && (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllHighConfidence}>
                Selecionar todas de alta confiança ({summary.high_confidence})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">Sugestões ({filteredSuggestions.length})</TabsTrigger>
          <TabsTrigger value="exceptions">Exceções ({unmatchedTransactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p>Analisando transações...</p>
              </CardContent>
            </Card>
          ) : filteredSuggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>Nenhuma sugestão de conciliação pendente</p>
              </CardContent>
            </Card>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <Card key={suggestion.transaction_id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 bg-muted/50 flex items-center gap-4">
                    <Checkbox checked={selectedSuggestions.has(suggestion.transaction_id)} onCheckedChange={() => toggleBatchSelection(suggestion.transaction_id)} disabled={suggestion.confidence_level !== 'high'} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getConfidenceBadge(suggestion.confidence_level, suggestion.confidence_score)}
                        {getMatchTypeBadge(suggestion.match_type)}
                        {suggestion.entries.length > 1 && <Badge variant="secondary">{suggestion.entries.length} títulos</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{suggestion.match_reasons.join(' • ')}</div>
                    </div>
                    
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(suggestion.transaction_id)}>
                      {expandedSuggestions.has(suggestion.transaction_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 divide-x">
                    <div className="p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Transação Bancária</div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data</span>
                          <span>{format(new Date(suggestion.transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor</span>
                          <span className={suggestion.transaction.amount < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                            R$ {Math.abs(suggestion.transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-sm">Descrição</span>
                          <p className="text-sm">{suggestion.transaction.description || '-'}</p>
                        </div>
                        {suggestion.extracted_name && (
                          <div>
                            <span className="text-muted-foreground text-sm">Nome extraído</span>
                            <p className="text-sm font-medium">{suggestion.extracted_name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">{suggestion.entries.length > 1 ? 'Títulos Sugeridos' : 'Título Sugerido'}</div>
                      <div className="space-y-3">
                        {suggestion.entries.map((entry, idx) => (
                          <div key={entry.id} className={idx > 0 ? 'pt-3 border-t' : ''}>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Valor</span>
                              <span className="font-bold">R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vencimento</span>
                              <span>{format(new Date(entry.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            {entry.entity_name && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fornecedor</span>
                                <span className="text-sm">{entry.entity_name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {suggestion.entries.length > 1 && (
                          <div className="pt-3 border-t">
                            <div className="flex justify-between font-bold">
                              <span>Total</span>
                              <span>R$ {suggestion.total_matched.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )}
                        
                        {suggestion.difference > 0.01 && (
                          <div className="text-red-600 text-sm">Diferença: R$ {suggestion.difference.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedSuggestions.has(suggestion.transaction_id) && (
                    <div className="p-4 bg-muted/30 border-t">
                      <div className="text-sm">
                        <strong>Motivos do match:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {suggestion.match_reasons.map((reason, idx) => <li key={idx}>{reason}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-muted/50 flex justify-end gap-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => discardSuggestion(suggestion.transaction_id)}>
                      <X className="w-4 h-4 mr-2" />Descartar
                    </Button>
                    <Button size="sm" onClick={() => confirmSuggestion(suggestion)} disabled={suggestion.difference > 0.01}>
                      <Check className="w-4 h-4 mr-2" />Confirmar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-4">
          {unmatchedTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>Nenhuma exceção pendente</p>
              </CardContent>
            </Card>
          ) : (
            unmatchedTransactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Sem match</Badge>
                        <span className="text-sm text-muted-foreground">{format(new Date(tx.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                      <p className="text-sm mb-1">{tx.description || 'Sem descrição'}</p>
                      <p className={`font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {tx.extracted_name && <p className="text-sm text-muted-foreground mt-1">Nome extraído: {tx.extracted_name}</p>}
                    </div>
                    <Button onClick={() => openManualSelection(tx)}>
                      <Search className="w-4 h-4 mr-2" />Selecionar títulos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleção Manual de Títulos</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Data</span>
                      <p>{format(new Date(selectedTransaction.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <p className={`font-bold ${selectedTransaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        R$ {Math.abs(selectedTransaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Descrição</span>
                      <p className="text-sm">{selectedTransaction.description || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="border rounded-lg">
                <div className="p-3 bg-muted font-medium">Títulos disponíveis ({availableEntries.length})</div>
                {loadingEntries ? (
                  <div className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {availableEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 border-b flex items-center gap-3 hover:bg-accent cursor-pointer ${selectedEntries.has(entry.id) ? 'bg-accent' : ''}`}
                        onClick={() => {
                          setSelectedEntries(prev => {
                            const next = new Set(prev);
                            if (next.has(entry.id)) next.delete(entry.id);
                            else next.add(entry.id);
                            return next;
                          });
                        }}
                      >
                        <Checkbox checked={selectedEntries.has(entry.id)} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{entry.entity_name || 'Sem fornecedor'}</span>
                            <span className="font-bold">R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Venc: {format(new Date(entry.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                            {entry.document_number && ` • Doc: ${entry.document_number}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Transação</span>
                      <p className="font-bold">R$ {Math.abs(selectedTransaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Selecionado ({selectedEntries.size})</span>
                      <p className="font-bold">R$ {calculateSelectedTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Diferença</span>
                      <p className={`font-bold ${Math.abs(Math.abs(selectedTransaction.amount) - calculateSelectedTotal()) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                        R$ {Math.abs(Math.abs(selectedTransaction.amount) - calculateSelectedTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmManualSelection} disabled={selectedEntries.size === 0 || Math.abs(Math.abs(selectedTransaction?.amount || 0) - calculateSelectedTotal()) > 0.01}>
              <Check className="w-4 h-4 mr-2" />Confirmar Conciliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReconciliationPanel;
