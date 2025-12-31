import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useChartOfAccounts, ChartOfAccount, AccountType, AccountNature } from '@/hooks/useFinanceiro';
import { AIBanner, AIInsight, DeleteConfirmDialog } from '@/components/shared';

// Tipos de conta (natureza contábil)
const ACCOUNT_TYPES: { value: AccountType; label: string; color: string }[] = [
  { value: 'receita', label: 'Receita', color: 'bg-green-500' },
  { value: 'despesa', label: 'Despesa', color: 'bg-orange-500' },
  { value: 'ativo', label: 'Ativo', color: 'bg-blue-500' },
  { value: 'passivo', label: 'Passivo', color: 'bg-red-500' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'bg-purple-500' },
  { value: 'custo', label: 'Custo', color: 'bg-yellow-500' },
];

// Natureza da conta (estrutural)
const ACCOUNT_NATURES: { value: AccountNature; label: string; description: string }[] = [
  { value: 'sintetica', label: 'Sintética', description: 'Conta de agrupamento (não recebe lançamentos)' },
  { value: 'analitica', label: 'Analítica', description: 'Conta de lançamento (recebe movimentações)' },
];

interface AccountFormData {
  code: string;
  name: string;
  type: AccountType;
  account_nature: AccountNature;
  parent_id: string | null;
  is_active: boolean;
}

const initialFormData: AccountFormData = {
  code: '',
  name: '',
  type: 'despesa',
  account_nature: 'analitica',
  parent_id: null,
  is_active: true,
};

export function PlanoContasList() {
  const { 
    accounts, 
    loading, 
    fetchAccounts, 
    buildTree, 
    createAccount, 
    updateAccount,
    deleteAccount 
  } = useChartOfAccounts();
  
  const [tree, setTree] = useState<ChartOfAccount[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  // Banner de IA - Insights contextuais
  const aiInsights = useMemo((): AIInsight[] => {
    const insights: AIInsight[] = [];
    
    // Insight: Sem contas cadastradas
    if (accounts.length === 0 && !loading) {
      insights.push({
        id: 'no-accounts',
        message: 'Você ainda não possui um Plano de Contas configurado. O Plano de Contas é fundamental para a categorização das receitas e despesas.',
        type: 'warning',
        action: {
          label: 'Criar primeira conta',
          onClick: () => handleOpenDialog(),
        },
      });
    }
    
    // Insight: Contas sem estrutura hierárquica
    const rootAccounts = accounts.filter(a => !a.parent_id);
    const hasHierarchy = accounts.some(a => a.parent_id);
    if (rootAccounts.length > 5 && !hasHierarchy) {
      insights.push({
        id: 'no-hierarchy',
        message: 'Considere organizar suas contas em uma estrutura hierárquica usando contas Sintéticas (grupos) para facilitar relatórios.',
        type: 'info',
      });
    }

    // Insight: Todas as contas de despesa estão inativas
    const despesaAccounts = accounts.filter(a => a.type === 'despesa');
    const activeDespesa = despesaAccounts.filter(a => a.is_active);
    if (despesaAccounts.length > 0 && activeDespesa.length === 0) {
      insights.push({
        id: 'no-active-despesa',
        message: 'Todas as contas de Despesa estão inativas. Ative pelo menos uma para poder categorizar gastos.',
        type: 'warning',
      });
    }

    return insights;
  }, [accounts, loading]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    setTree(buildTree(accounts));
  }, [accounts, buildTree]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleOpenDialog = (account?: ChartOfAccount, parentId?: string) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        code: account.code,
        name: account.name,
        type: account.type,
        account_nature: account.account_nature || 'analitica',
        parent_id: account.parent_id,
        is_active: account.is_active,
      });
    } else {
      setEditingAccount(null);
      setFormData({ ...initialFormData, parent_id: parentId || null });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) return;
    
    setIsSubmitting(true);

    try {
      const { data: companies } = await (await import('@/integrations/supabase/client')).supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      const companyId = companies?.[0]?.id;
      if (!companyId) {
        setIsSubmitting(false);
        return;
      }

      if (editingAccount) {
        const success = await updateAccount(editingAccount.id, formData);
        if (success) {
          setDialogOpen(false);
          fetchAccounts();
        }
      } else {
        const result = await createAccount({ ...formData, company_id: companyId });
        if (result) {
          setDialogOpen(false);
          fetchAccounts();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (account: ChartOfAccount) => {
    setAccountToDelete(account);
    setDeleteError(undefined);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<boolean> => {
    if (!accountToDelete) return false;
    
    const result = await deleteAccount(accountToDelete.id);
    
    if (!result.success) {
      setDeleteError(result.error);
      return false;
    }
    
    fetchAccounts();
    setAccountToDelete(null);
    return true;
  };

  const filterAccounts = (items: ChartOfAccount[], query: string): ChartOfAccount[] => {
    if (!query) return items;
    
    return items.reduce<ChartOfAccount[]>((acc, item) => {
      const matches = item.name.toLowerCase().includes(query.toLowerCase()) ||
                      item.code.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = item.children ? filterAccounts(item.children, query) : [];
      
      if (matches || filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren });
      }
      return acc;
    }, []);
  };

  const renderTree = (items: ChartOfAccount[], level = 0) => {
    return items.map(account => {
      const hasChildren = account.children && account.children.length > 0;
      const isExpanded = expanded.has(account.id);
      const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.type);
      const natureInfo = ACCOUNT_NATURES.find(n => n.value === account.account_nature);

      return (
        <div key={account.id}>
          <div
            className={`flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors group`}
            style={{ paddingLeft: `${level * 24 + 12}px` }}
          >
            {hasChildren ? (
              <button onClick={() => toggleExpand(account.id)} className="p-1 hover:bg-muted rounded">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <span className="font-mono text-sm text-muted-foreground w-24">{account.code}</span>
            <span className="flex-1 font-medium">{account.name}</span>
            
            {/* Badge de Natureza (Sintética/Analítica) */}
            <Badge 
              variant="outline" 
              className={`text-xs ${account.account_nature === 'sintetica' ? 'border-violet-500 text-violet-600' : 'border-slate-400 text-slate-600'}`}
            >
              {natureInfo?.label || 'Analítica'}
            </Badge>
            
            {/* Badge de Tipo (Receita/Despesa) */}
            <Badge variant="secondary" className={`${typeInfo?.color} text-white text-xs`}>
              {typeInfo?.label}
            </Badge>
            
            {!account.is_active && (
              <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">Inativo</Badge>
            )}
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenDialog(account)}
                title="Editar conta"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenDialog(undefined, account.id)}
                title="Adicionar subconta"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteClick(account)}
                title="Excluir conta"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {hasChildren && isExpanded && renderTree(account.children!, level + 1)}
        </div>
      );
    });
  };

  const filteredTree = filterAccounts(tree, search);

  return (
    <div className="space-y-4">
      {/* Banner de IA */}
      <AIBanner 
        insights={aiInsights} 
        context="Plano de Contas"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center gap-2 py-2 px-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
          <div className="w-6" />
          <span className="w-24">Código</span>
          <span className="flex-1">Descrição</span>
          <span className="w-24 text-center">Tipo</span>
          <span className="w-24 text-center">Natureza</span>
          <span className="w-16 text-center">Status</span>
          <span className="w-24 text-right">Ações</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filteredTree.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search ? 'Nenhuma conta encontrada' : 'Nenhuma conta cadastrada'}
          </div>
        ) : (
          <div className="p-2">{renderTree(filteredTree)}</div>
        )}
      </div>

      {/* Modal de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="1.1.01"
                />
              </div>
              <div className="col-span-3">
                <Label htmlFor="name">Descrição *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da conta"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Natureza (Contábil)</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AccountType) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account_nature">Tipo (Estrutural)</Label>
                <Select
                  value={formData.account_nature}
                  onValueChange={(value: AccountNature) => setFormData(prev => ({ ...prev, account_nature: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_NATURES.map(nature => (
                      <SelectItem key={nature.value} value={nature.value}>
                        <div className="flex flex-col">
                          <span>{nature.label}</span>
                          <span className="text-xs text-muted-foreground">{nature.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="parent">Conta Pai</Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value === 'none' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {accounts
                    .filter(a => a.id !== editingAccount?.id)
                    .map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name} ({account.account_nature === 'sintetica' ? 'Sintética' : 'Analítica'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione a conta pai para criar uma hierarquia.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Conta ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}>
              {isSubmitting ? 'Salvando...' : (editingAccount ? 'Salvar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setAccountToDelete(null);
        }}
        title="Excluir Conta"
        description="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
        itemName={accountToDelete ? `${accountToDelete.code} - ${accountToDelete.name}` : undefined}
        onConfirm={handleDeleteConfirm}
        errorMessage={deleteError}
      />
    </div>
  );
}
