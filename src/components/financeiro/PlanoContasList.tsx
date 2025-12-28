import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useChartOfAccounts, ChartOfAccount, AccountType } from '@/hooks/useFinanceiro';

const ACCOUNT_TYPES: { value: AccountType; label: string; color: string }[] = [
  { value: 'ativo', label: 'Ativo', color: 'bg-blue-500' },
  { value: 'passivo', label: 'Passivo', color: 'bg-red-500' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'bg-purple-500' },
  { value: 'receita', label: 'Receita', color: 'bg-green-500' },
  { value: 'despesa', label: 'Despesa', color: 'bg-orange-500' },
  { value: 'custo', label: 'Custo', color: 'bg-yellow-500' },
];

interface AccountFormData {
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  is_active: boolean;
}

const initialFormData: AccountFormData = {
  code: '',
  name: '',
  type: 'despesa',
  parent_id: null,
  is_active: true,
};

export function PlanoContasList() {
  const { accounts, loading, fetchAccounts, buildTree, createAccount, updateAccount } = useChartOfAccounts();
  const [tree, setTree] = useState<ChartOfAccount[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(initialFormData);

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

    const { data: companies } = await (await import('@/integrations/supabase/client')).supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    const companyId = companies?.[0]?.id;
    if (!companyId) return;

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

      return (
        <div key={account.id}>
          <div
            className={`flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors`}
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
            
            <Badge variant="secondary" className={`${typeInfo?.color} text-white text-xs`}>
              {typeInfo?.label}
            </Badge>
            
            {!account.is_active && (
              <Badge variant="outline" className="text-xs">Inativo</Badge>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleOpenDialog(account)}
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
          </div>
          
          {hasChildren && isExpanded && renderTree(account.children!, level + 1)}
        </div>
      );
    });
  };

  const filteredTree = filterAccounts(tree, search);

  return (
    <div className="space-y-4">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="1.1.01"
                />
              </div>
              <div className="col-span-3">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da conta"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">Tipo</Label>
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
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingAccount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
