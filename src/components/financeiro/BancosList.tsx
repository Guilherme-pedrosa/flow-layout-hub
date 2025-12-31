import { useState, useEffect } from 'react';
import { useBankAccounts, BankAccount } from '@/hooks/useFinanceiro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Landmark, Wallet, PiggyBank, Settings, Upload, Key, FileKey, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';

interface InterCredentials {
  id: string;
  client_id: string;
  certificate_file_path: string;
  private_key_file_path: string;
  account_number: string | null;
  is_active: boolean;
  last_sync_at: string | null;
}

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
  const { currentCompany } = useCompany();
  const { bankAccounts, loading, fetchBankAccounts, createBankAccount, updateBankAccount, toggleBankAccountStatus, deleteBankAccount } = useBankAccounts();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [interDialogOpen, setInterDialogOpen] = useState(false);
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
  
  // Inter API Config State
  const [interLoading, setInterLoading] = useState(false);
  const [interSaving, setInterSaving] = useState(false);
  const [interCredentials, setInterCredentials] = useState<InterCredentials | null>(null);
  const [interClientId, setInterClientId] = useState('');
  const [interClientSecret, setInterClientSecret] = useState('');
  const [interAccountNumber, setInterAccountNumber] = useState('');
  const [interCertFile, setInterCertFile] = useState<File | null>(null);
  const [interKeyFile, setInterKeyFile] = useState<File | null>(null);
  const [selectedAccountForInter, setSelectedAccountForInter] = useState<BankAccount | null>(null);

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

  const loadInterCredentials = async () => {
    if (!currentCompany?.id) return;
    
    setInterLoading(true);
    try {
      const { data, error } = await supabase
        .from("inter_credentials")
        .select("id, client_id, certificate_file_path, private_key_file_path, account_number, is_active, last_sync_at")
        .eq("company_id", currentCompany.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setInterCredentials(data);
        setInterClientId(data.client_id);
        setInterAccountNumber(data.account_number || "");
      } else {
        setInterCredentials(null);
        setInterClientId("");
        setInterAccountNumber("");
      }
    } catch (error) {
      console.error("Erro ao carregar credenciais:", error);
    } finally {
      setInterLoading(false);
    }
  };

  const handleOpenInterDialog = (account: BankAccount) => {
    setSelectedAccountForInter(account);
    setInterAccountNumber(account.account_number || "");
    loadInterCredentials();
    setInterDialogOpen(true);
  };

  const handleInterFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

  const handleSaveInterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentCompany?.id) {
      toast.error("Selecione uma empresa");
      return;
    }

    if (!interClientId || !interClientSecret) {
      toast.error("Preencha o Client ID e Client Secret");
      return;
    }

    if (!interAccountNumber) {
      toast.error("O número da conta corrente é obrigatório");
      return;
    }

    if (!interCredentials && (!interCertFile || !interKeyFile)) {
      toast.error("Faça upload do certificado e da chave privada");
      return;
    }

    setInterSaving(true);

    try {
      let certPath = interCredentials?.certificate_file_path || "";
      let keyPath = interCredentials?.private_key_file_path || "";

      if (interCertFile) {
        certPath = `${currentCompany.id}/cert.crt`;
        const { error: certError } = await supabase.storage
          .from("inter-certs")
          .upload(certPath, interCertFile, { upsert: true });

        if (certError) throw new Error(`Erro no upload do certificado: ${certError.message}`);
      }

      if (interKeyFile) {
        keyPath = `${currentCompany.id}/key.key`;
        const { error: keyError } = await supabase.storage
          .from("inter-certs")
          .upload(keyPath, interKeyFile, { upsert: true });

        if (keyError) throw new Error(`Erro no upload da chave: ${keyError.message}`);
      }

      const { error: dbError } = await supabase
        .from("inter_credentials")
        .upsert({
          company_id: currentCompany.id,
          client_id: interClientId,
          client_secret: interClientSecret,
          certificate_file_path: certPath,
          private_key_file_path: keyPath,
          account_number: interAccountNumber || null,
        }, { onConflict: "company_id" });

      if (dbError) throw dbError;

      toast.success("Configuração do Banco Inter salva com sucesso!");
      setInterCertFile(null);
      setInterKeyFile(null);
      setInterClientSecret("");
      setInterDialogOpen(false);
      loadInterCredentials();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setInterSaving(false);
    }
  };

  const isInterBank = (bankName: string | null) => {
    if (!bankName) return false;
    return bankName.toLowerCase().includes('inter');
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

  const handleOpenDeleteDialog = (account: BankAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAccount = async (): Promise<boolean> => {
    if (!accountToDelete) return false;
    const success = await deleteBankAccount(accountToDelete.id);
    if (success) {
      await fetchBankAccounts();
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
    return success;
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
                      {isInterBank(account.bank_name) && (
                        <Badge variant="secondary" className="text-xs">Inter</Badge>
                      )}
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
                    <div className="flex items-center justify-end gap-1">
                      {isInterBank(account.bank_name) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenInterDialog(account)}
                          title="Configurar API Inter"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(account)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteDialog(account)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Inter API Config Dialog */}
      <Dialog open={interDialogOpen} onOpenChange={setInterDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar API Banco Inter
            </DialogTitle>
            <DialogDescription>
              Configure as credenciais da API do Banco Inter para {selectedAccountForInter?.name}
            </DialogDescription>
          </DialogHeader>
          
          {interLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSaveInterConfig} className="space-y-4">
              {/* Status atual */}
              {interCredentials ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="text-sm">
                    <p className="font-medium text-green-600">Integração configurada</p>
                    <p className="text-muted-foreground">
                      Última sincronização: {interCredentials.last_sync_at 
                        ? new Date(interCredentials.last_sync_at).toLocaleString("pt-BR") 
                        : "Nunca"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Integração não configurada</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="interClientId">Client ID</Label>
                <Input
                  id="interClientId"
                  value={interClientId}
                  onChange={(e) => setInterClientId(e.target.value)}
                  placeholder="Seu Client ID do Banco Inter"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interClientSecret">
                  Client Secret
                  {interCredentials && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (deixe em branco para manter o atual)
                    </span>
                  )}
                </Label>
                <Input
                  id="interClientSecret"
                  type="password"
                  value={interClientSecret}
                  onChange={(e) => setInterClientSecret(e.target.value)}
                  placeholder={interCredentials ? "••••••••••••" : "Seu Client Secret"}
                  required={!interCredentials}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interAccountNumber">Número da Conta Corrente</Label>
                <Input
                  id="interAccountNumber"
                  value={interAccountNumber}
                  onChange={(e) => setInterAccountNumber(e.target.value)}
                  placeholder="Ex: 12345678-9"
                  required
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="interCertFile" className="flex items-center gap-2">
                  <FileKey className="h-4 w-4" />
                  Certificado Digital (.crt)
                  {interCredentials?.certificate_file_path && !interCertFile && (
                    <Badge variant="outline" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </Label>
                <Input
                  id="interCertFile"
                  type="file"
                  accept=".crt,.pem,.cer"
                  onChange={(e) => handleInterFileChange(e, setInterCertFile)}
                />
                {interCertFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {interCertFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="interKeyFile" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Chave Privada (.key)
                  {interCredentials?.private_key_file_path && !interKeyFile && (
                    <Badge variant="outline" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </Label>
                <Input
                  id="interKeyFile"
                  type="file"
                  accept=".key,.pem"
                  onChange={(e) => handleInterFileChange(e, setInterKeyFile)}
                />
                {interKeyFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {interKeyFile.name}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setInterDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={interSaving}>
                  {interSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {interCredentials ? "Atualizar" : "Configurar"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteAccount}
        title="Excluir Conta Bancária"
        description={`Tem certeza que deseja excluir a conta "${accountToDelete?.name}"? Esta ação não poderá ser desfeita.`}
        itemName={accountToDelete?.name}
      />
    </div>
  );
}