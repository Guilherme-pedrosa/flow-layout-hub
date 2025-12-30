import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  AlertCircle,
  Search,
  Lightbulb,
  ListChecks,
  ArrowRight,
  Users,
  Calendar,
  Loader2,
  Sparkles
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  bank_account_id: string | null;
}

interface FinancialEntry {
  id: string;
  document_number: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  is_paid: boolean;
  client_name?: string;
  supplier_name?: string;
  type: 'receivable' | 'payable';
}

interface Suggestion {
  entries: FinancialEntry[];
  totalAmount: number;
  matchType: 'exact' | 'aggregation' | 'partial';
  matchReason: string;
  score: number;
}

interface ReconciliationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: BankTransaction | null;
  companyId: string;
  onSuccess: () => void;
}

// Função para normalizar texto para matching
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '') // remove especiais
    .trim();
}

// Função para calcular score de matching por texto
function textMatchScore(text1: string | null, text2: string | null): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  if (!normalized1 || !normalized2) return 0;
  
  const tokens1 = normalized1.split(/\s+/);
  const tokens2 = normalized2.split(/\s+/);
  
  let matchCount = 0;
  for (const token of tokens1) {
    if (token.length > 2 && tokens2.some(t => t.includes(token) || token.includes(t))) {
      matchCount++;
    }
  }
  
  return matchCount / Math.max(tokens1.length, 1);
}

// Função para calcular score de proximidade de data
function dateProximityScore(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 1;
  if (diffDays <= 1) return 0.9;
  if (diffDays <= 3) return 0.7;
  if (diffDays <= 7) return 0.5;
  if (diffDays <= 14) return 0.3;
  return 0.1;
}

export function ReconciliationModal({
  open,
  onOpenChange,
  transaction,
  companyId,
  onSuccess
}: ReconciliationModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("suggestions");

  const isCredit = transaction?.type === "CREDIT";
  const transactionAmount = Math.abs(transaction?.amount || 0);

  // Carregar dados financeiros
  useEffect(() => {
    if (open && transaction) {
      loadFinancialData();
      setSelectedIds(new Set());
      setNotes("");
      setActiveTab("suggestions");
    }
  }, [open, transaction]);

  const loadFinancialData = async () => {
    if (!transaction) return;
    
    setLoading(true);
    try {
      if (isCredit) {
        // Carregar contas a receber
        const { data, error } = await supabase
          .from("accounts_receivable")
          .select("*, clientes(razao_social, nome_fantasia)")
          .eq("company_id", companyId)
          .eq("is_paid", false)
          .is("reconciliation_id", null)
          .order("due_date", { ascending: true });

        if (error) throw error;

        const entries: FinancialEntry[] = (data || []).map(r => ({
          id: r.id,
          document_number: r.document_number,
          description: r.description,
          amount: r.amount,
          due_date: r.due_date,
          is_paid: r.is_paid || false,
          client_name: r.clientes?.nome_fantasia || r.clientes?.razao_social || undefined,
          type: 'receivable' as const
        }));
        
        setFinancialEntries(entries);
        generateSuggestions(entries);
      } else {
        // Carregar contas a pagar
        const { data, error } = await supabase
          .from("payables")
          .select("*, pessoas:supplier_id(razao_social, nome_fantasia)")
          .eq("company_id", companyId)
          .eq("is_paid", false)
          .is("reconciliation_id", null)
          .order("due_date", { ascending: true });

        if (error) throw error;

        const entries: FinancialEntry[] = (data || []).map(p => ({
          id: p.id,
          document_number: p.document_number,
          description: p.description,
          amount: p.amount,
          due_date: p.due_date,
          is_paid: p.is_paid || false,
          supplier_name: (p.pessoas as any)?.nome_fantasia || (p.pessoas as any)?.razao_social || undefined,
          type: 'payable' as const
        }));
        
        setFinancialEntries(entries);
        generateSuggestions(entries);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  // Gerar sugestões de conciliação
  const generateSuggestions = (entries: FinancialEntry[]) => {
    if (!transaction) return;
    
    const amount = transactionAmount;
    const txDate = transaction.transaction_date;
    const txDescription = transaction.description;
    
    const newSuggestions: Suggestion[] = [];
    
    // 1. Match exato por valor
    const exactMatches = entries.filter(e => Math.abs(e.amount - amount) < 0.01);
    for (const entry of exactMatches) {
      const dateScore = dateProximityScore(txDate, entry.due_date);
      const textScore = textMatchScore(txDescription, entry.client_name || entry.supplier_name || entry.description);
      
      newSuggestions.push({
        entries: [entry],
        totalAmount: entry.amount,
        matchType: 'exact',
        matchReason: `Valor exato${dateScore > 0.8 ? ' + Data próxima' : ''}${textScore > 0.3 ? ' + Nome similar' : ''}`,
        score: 100 + (dateScore * 20) + (textScore * 10)
      });
    }
    
    // 2. Aglutinação por cliente/fornecedor
    const nameKey = isCredit ? 'client_name' : 'supplier_name';
    const groupedByName = new Map<string, FinancialEntry[]>();
    
    for (const entry of entries) {
      const name = (entry as any)[nameKey] || 'Sem nome';
      if (!groupedByName.has(name)) {
        groupedByName.set(name, []);
      }
      groupedByName.get(name)!.push(entry);
    }
    
    // Tentar encontrar combinações que somam o valor
    for (const [name, group] of groupedByName) {
      if (name === 'Sem nome') continue;
      
      // Ordenar por valor para facilitar combinação
      const sorted = [...group].sort((a, b) => a.amount - b.amount);
      
      // Tentar combinações simples (até 10 títulos)
      const findCombinations = (target: number, items: FinancialEntry[], maxItems: number): FinancialEntry[][] => {
        const results: FinancialEntry[][] = [];
        
        const backtrack = (start: number, remaining: number, current: FinancialEntry[]) => {
          if (Math.abs(remaining) < 0.01 && current.length > 1) {
            results.push([...current]);
            return;
          }
          if (remaining < 0 || current.length >= maxItems) return;
          
          for (let i = start; i < items.length; i++) {
            current.push(items[i]);
            backtrack(i + 1, remaining - items[i].amount, current);
            current.pop();
          }
        };
        
        backtrack(0, target, []);
        return results;
      };
      
      const combinations = findCombinations(amount, sorted, 10);
      
      for (const combo of combinations) {
        const total = combo.reduce((sum, e) => sum + e.amount, 0);
        const avgDateScore = combo.reduce((sum, e) => sum + dateProximityScore(txDate, e.due_date), 0) / combo.length;
        const textScore = textMatchScore(txDescription, name);
        
        newSuggestions.push({
          entries: combo,
          totalAmount: total,
          matchType: 'aggregation',
          matchReason: `Aglutinação: ${combo.length} títulos de "${name}"`,
          score: 90 + (avgDateScore * 15) + (textScore * 15)
        });
      }
    }
    
    // Ordenar por score
    newSuggestions.sort((a, b) => b.score - a.score);
    setSuggestions(newSuggestions.slice(0, 10)); // Manter top 10
  };

  // Cálculos
  const selectedEntries = useMemo(() => 
    financialEntries.filter(e => selectedIds.has(e.id)),
    [financialEntries, selectedIds]
  );
  
  const selectedTotal = useMemo(() => 
    selectedEntries.reduce((sum, e) => sum + e.amount, 0),
    [selectedEntries]
  );
  
  const difference = transactionAmount - selectedTotal;
  const isExactMatch = Math.abs(difference) < 0.01;

  // Filtrar entradas
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return financialEntries;
    const term = normalizeText(searchTerm);
    return financialEntries.filter(e => 
      normalizeText(e.client_name || e.supplier_name || '').includes(term) ||
      normalizeText(e.document_number || '').includes(term) ||
      normalizeText(e.description || '').includes(term)
    );
  }, [financialEntries, searchTerm]);

  // Toggle seleção
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Aplicar sugestão
  const applySuggestion = (suggestion: Suggestion) => {
    setSelectedIds(new Set(suggestion.entries.map(e => e.id)));
    setActiveTab("manual");
  };

  // Confirmar conciliação
  const handleConfirm = async () => {
    if (!transaction || selectedIds.size === 0 || !isExactMatch) return;
    
    setSaving(true);
    try {
      // Buscar situação "Conciliado Manual" para atribuição automática
      const { data: situacaoManual } = await supabase
        .from("financial_situations")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", "%conciliado manual%")
        .eq("is_active", true)
        .single();

      // 1. Criar registro de conciliação
      const { data: reconciliation, error: recError } = await supabase
        .from("bank_reconciliations")
        .insert({
          company_id: companyId,
          bank_transaction_id: transaction.id,
          total_reconciled_amount: transactionAmount,
          method: 'manual',
          notes: notes || null
        })
        .select()
        .single();

      if (recError) throw recError;

      // 2. Criar itens da conciliação
      const items = selectedEntries.map(entry => ({
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
      const { error: txError } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_with_id: reconciliation.id,
          reconciled_with_type: selectedIds.size > 1 ? 'MULTI' : 'SINGLE'
        })
        .eq("id", transaction.id);

      if (txError) throw txError;

      // 4. Atualizar títulos financeiros com situação "Conciliado Manual"
      if (isCredit) {
        for (const entry of selectedEntries) {
          const updateData: Record<string, unknown> = {
            is_paid: true,
            paid_at: transaction.transaction_date,
            paid_amount: entry.amount,
            bank_transaction_id: transaction.id,
            reconciled_at: new Date().toISOString(),
            reconciliation_id: reconciliation.id,
            payment_method: 'transferencia'
          };

          // Adicionar situação financeira automaticamente (Conciliado Manual)
          if (situacaoManual?.id) {
            updateData.financial_situation_id = situacaoManual.id;
          }

          const { error } = await supabase
            .from("accounts_receivable")
            .update(updateData)
            .eq("id", entry.id);
          
          if (error) throw error;
        }
      } else {
        for (const entry of selectedEntries) {
          const updateData: Record<string, unknown> = {
            is_paid: true,
            paid_at: transaction.transaction_date,
            paid_amount: entry.amount,
            reconciliation_id: reconciliation.id,
            payment_method: 'transferencia'
          };

          // Adicionar situação financeira automaticamente (Conciliado Manual)
          if (situacaoManual?.id) {
            updateData.financial_situation_id = situacaoManual.id;
          }

          const { error } = await supabase
            .from("payables")
            .update(updateData)
            .eq("id", entry.id);
          
          if (error) throw error;
        }
      }

      toast.success(`Conciliação realizada! ${selectedIds.size} título(s) vinculado(s).`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro na conciliação:", error);
      toast.error("Erro ao realizar conciliação");
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Conciliação Bancária
          </DialogTitle>
          <DialogDescription>
            Vincule esta transação a um ou mais títulos {isCredit ? 'a receber' : 'a pagar'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Card da Transação */}
          <Card className="bg-muted/50 shrink-0">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className={`font-bold text-lg ${isCredit ? "text-green-600" : "text-red-600"}`}>
                    {isCredit ? "+" : "-"}{formatCurrency(transactionAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant={isCredit ? "default" : "secondary"}>
                    {isCredit ? "Crédito" : "Débito"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NSU</p>
                  <p className="font-mono text-sm">{transaction.nsu || "-"}</p>
                </div>
                <div className="md:col-span-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm truncate">{transaction.description || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de Sugestões e Seleção Manual */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="suggestions" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Sugestões ({suggestions.length})
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Search className="h-4 w-4" />
                Seleção Manual
              </TabsTrigger>
            </TabsList>

            {/* Tab de Sugestões */}
            <TabsContent value="suggestions" className="flex-1 overflow-hidden mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium">Nenhuma sugestão encontrada</p>
                  <p className="text-sm text-muted-foreground">
                    Use a aba "Seleção Manual" para buscar títulos
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {suggestions.map((suggestion, idx) => (
                      <Card 
                        key={idx} 
                        className={`cursor-pointer transition-all hover:border-primary ${
                          suggestion.matchType === 'exact' ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''
                        }`}
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                suggestion.matchType === 'exact' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                              }`}>
                                {suggestion.matchType === 'exact' ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ListChecks className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{suggestion.matchReason}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{suggestion.entries.length} título(s)</span>
                                  <span>•</span>
                                  <span>Total: {formatCurrency(suggestion.totalAmount)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {suggestion.matchType === 'exact' && (
                                <Badge className="bg-green-500">Match Exato</Badge>
                              )}
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          {suggestion.entries.length > 1 && (
                            <div className="mt-2 pl-12 text-sm text-muted-foreground">
                              {suggestion.entries.slice(0, 3).map((e, i) => (
                                <span key={e.id}>
                                  {i > 0 && " + "}
                                  {formatCurrency(e.amount)}
                                </span>
                              ))}
                              {suggestion.entries.length > 3 && (
                                <span> + {suggestion.entries.length - 3} mais</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Tab de Seleção Manual */}
            <TabsContent value="manual" className="flex-1 overflow-hidden mt-4 flex flex-col gap-3">
              <div className="flex gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Buscar ${isCredit ? 'cliente' : 'fornecedor'}, documento...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="flex-1 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>{isCredit ? 'Cliente' : 'Fornecedor'}</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum título encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map((entry) => {
                          const isSelected = selectedIds.has(entry.id);
                          const valueDiff = Math.abs(entry.amount - transactionAmount);
                          const isExact = valueDiff < 0.01;

                          return (
                            <TableRow
                              key={entry.id}
                              className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""} ${isExact && !isSelected ? "bg-green-50/50 dark:bg-green-950/20" : ""}`}
                              onClick={() => toggleSelection(entry.id)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelection(entry.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  {entry.client_name || entry.supplier_name || "-"}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {entry.document_number || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {formatDate(entry.due_date)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={isExact ? "text-green-600 font-medium" : ""}>
                                  {formatCurrency(entry.amount)}
                                </span>
                                {isExact && (
                                  <Badge className="ml-2 bg-green-500" variant="secondary">
                                    Exato
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          {/* Resumo da Seleção */}
          <Card className={`shrink-0 ${isExactMatch ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : difference !== transactionAmount ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
            <CardContent className="py-3">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor da Transação</p>
                    <p className="font-bold text-lg">{formatCurrency(transactionAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Selecionado ({selectedIds.size})</p>
                    <p className="font-bold text-lg">{formatCurrency(selectedTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Diferença</p>
                    <p className={`font-bold text-lg ${isExactMatch ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatCurrency(difference)}
                    </p>
                  </div>
                </div>
                
                {!isExactMatch && selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">A soma deve ser igual ao valor da transação</span>
                  </div>
                )}
                
                {isExactMatch && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Valores conferem!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {selectedIds.size > 0 && (
            <div className="shrink-0">
              <Label htmlFor="notes" className="text-sm">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione uma nota sobre esta conciliação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          )}
        </div>

        <Separator className="my-2" />

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isExactMatch || selectedIds.size === 0 || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirmar Conciliação ({selectedIds.size} título{selectedIds.size !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Force rebuild
