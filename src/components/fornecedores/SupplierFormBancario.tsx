import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Check, X, Landmark } from "lucide-react";
import { useSupplierBankAccounts, SupplierBankAccountInsert } from "@/hooks/useSupplierBankAccounts";

interface SupplierFormBancarioProps {
  pessoaId?: string;
}

const BANCOS = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "356", nome: "Banco Real" },
  { codigo: "389", nome: "Mercantil do Brasil" },
  { codigo: "399", nome: "HSBC" },
  { codigo: "422", nome: "Safra" },
  { codigo: "453", nome: "Banco Rural" },
  { codigo: "633", nome: "Rendimento" },
  { codigo: "652", nome: "Itaú Unibanco" },
  { codigo: "745", nome: "Citibank" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "077", nome: "Banco Inter" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "336", nome: "C6 Bank" },
  { codigo: "290", nome: "PagBank" },
  { codigo: "380", nome: "PicPay" },
];

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatorio", label: "Chave Aleatória" },
];

interface BancarioLocal {
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  pix_key: string;
  pix_key_type: string;
  is_principal: boolean;
}

export function SupplierFormBancario({ pessoaId }: SupplierFormBancarioProps) {
  const { bankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, isLoading } = useSupplierBankAccounts(pessoaId);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BancarioLocal>({
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    pix_key: "",
    pix_key_type: "",
    is_principal: false,
  });

  const resetForm = () => {
    setFormData({
      banco: "",
      agencia: "",
      conta: "",
      tipo_conta: "corrente",
      pix_key: "",
      pix_key_type: "",
      is_principal: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!pessoaId) return;
    
    const data: SupplierBankAccountInsert = {
      pessoa_id: pessoaId,
      ...formData,
    };

    if (editingId) {
      await updateBankAccount.mutateAsync({ id: editingId, ...formData });
    } else {
      await createBankAccount.mutateAsync(data);
    }
    resetForm();
  };

  const handleEdit = (account: any) => {
    setFormData({
      banco: account.banco || "",
      agencia: account.agencia || "",
      conta: account.conta || "",
      tipo_conta: account.tipo_conta || "corrente",
      pix_key: account.pix_key || "",
      pix_key_type: account.pix_key_type || "",
      is_principal: account.is_principal,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteBankAccount.mutateAsync(id);
  };

  const getBancoNome = (codigo: string) => {
    const banco = BANCOS.find(b => b.codigo === codigo);
    return banco ? banco.nome : codigo;
  };

  if (!pessoaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Salve o fornecedor primeiro para adicionar dados bancários.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Dados Bancários</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Conta
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Editar Conta" : "Nova Conta"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select
                  value={formData.banco}
                  onValueChange={(value) => setFormData({ ...formData, banco: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map((banco) => (
                      <SelectItem key={banco.codigo} value={banco.codigo}>
                        {banco.codigo} - {banco.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Input
                  value={formData.conta}
                  onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select
                  value={formData.tipo_conta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo Chave PIX</Label>
                <Select
                  value={formData.pix_key_type}
                  onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_KEY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_principal_bank"
                checked={formData.is_principal}
                onCheckedChange={(checked) => setFormData({ ...formData, is_principal: !!checked })}
              />
              <Label htmlFor="is_principal_bank" className="cursor-pointer">Conta Principal</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bankAccounts.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead className="text-center">Principal</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{getBancoNome(account.banco || "")}</TableCell>
                    <TableCell>{account.agencia || "-"}</TableCell>
                    <TableCell>{account.conta || "-"}</TableCell>
                    <TableCell className="capitalize">{account.tipo_conta}</TableCell>
                    <TableCell>{account.pix_key || "-"}</TableCell>
                    <TableCell className="text-center">
                      {account.is_principal ? "✓" : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {bankAccounts.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Landmark className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            Nenhum dado bancário cadastrado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
