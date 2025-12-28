import { useState, useEffect } from 'react';
import { useBankAccounts, BankAccount } from '@/hooks/useFinanceiro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Landmark, Wallet, PiggyBank } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const accountTypeLabels: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  caixa: 'Caixa',
};

const accountTypeIcons: Record<string, React.ReactNode> = {
  corrente: <Landmark className="h-4 w-4" />,
  poupanca: <PiggyBank className="h-4 w-4" />,
  caixa: <Wallet className="h-4 w-4" />,
};

export function BancosList() {
  const { bankAccounts, loading, fetchBankAccounts, createBankAccount, updateBankAccount, toggleBankAccountStatus } = useBankAccounts();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    agency: '',
    account_number: '',
    account_type: 'corrente',
    initial_balance: 0,
  });
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    fetchBankAccounts();
    loadCompanyId();
  }, [fetchBankAccounts]);

  const loadCompanyId = async () => {
    const { data } = await supabase.from('companies').select('id').limit(1);
    if (data?.[0]?.id) {
      setCompanyId(data[0].id);
    }
  };

  const filteredAccounts = bankAccounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      acc.bank_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        bank_name: account.bank_name || '',
        agency: account.agency || '',
        account_number: account.account_number || '',
        account_type: account.account_type,
        initial_balance: account.initial_balance,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        bank_name: '',
        agency: '',
        account_number: '',
        account_type: 'corrente',
        initial_balance: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    if (editingAccount) {
      const success = await updateBankAccount(editingAccount.id, {
        name: formData.name,
        bank_name: formData.bank_name || null,
        agency: formData.agency || null,
        account_number: formData.account_number || null,
        account_type: formData.account_type,
      });
      if (success) {
        await fetchBankAccounts();
        setDialogOpen(false);
      }
    } else {
      const result = await createBankAccount({
        company_id: companyId,
        name: formData.name,
        bank_name: formData.bank_name || null,
        agency: formData.agency || null,
        account_number: formData.account_number || null,
        account_type: formData.account_type,
        initial_balance: formData.initial_balance,
        is_active: true,
      });
      if (result) {
        await fetchBankAccounts();
        setDialogOpen(false);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalBalance = bankAccounts
    .filter((acc) => acc.is_active)
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Total (Contas Ativas)</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
          </div>
          <Landmark className="h-12 w-12 text-muted-foreground/30" />
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Agência / Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow key={account.id} className={!account.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {accountTypeIcons[account.account_type] || <Landmark className="h-4 w-4" />}
                      {account.name}
                    </div>
                  </TableCell>
                  <TableCell>{account.bank_name || '-'}</TableCell>
                  <TableCell>
                    {account.agency || account.account_number
                      ? `${account.agency || ''} / ${account.account_number || ''}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {accountTypeLabels[account.account_type] || account.account_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={account.current_balance < 0 ? 'text-destructive' : 'text-primary'}>
                      {formatCurrency(account.current_balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={account.is_active}
                      onCheckedChange={(checked) => toggleBankAccountStatus(account.id, checked).then(() => fetchBankAccounts())}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Editar Conta' : 'Nova Conta Bancária'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Conta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Caixa Principal, Bradesco Matriz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_type">Tipo de Conta</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.account_type !== 'caixa' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Nome do Banco</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Ex: Bradesco, Itaú, Nubank"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agency">Agência</Label>
                    <Input
                      id="agency"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      placeholder="0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Número da Conta</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="00000-0"
                    />
                  </div>
                </div>
              </>
            )}
            {!editingAccount && (
              <div className="space-y-2">
                <Label htmlFor="initial_balance">Saldo Inicial</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingAccount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}