import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import { usePessoaEnderecos, PessoaEnderecoInsert } from "@/hooks/usePessoaEnderecos";

interface SupplierFormEnderecosProps {
  pessoaId?: string;
}

const TIPO_ENDERECO_OPTIONS = [
  { value: "principal", label: "Principal" },
  { value: "cobranca", label: "Cobrança" },
  { value: "entrega", label: "Entrega" },
  { value: "outro", label: "Outro" },
];

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

interface EnderecoLocal {
  id?: string;
  tipo_endereco: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  is_principal: boolean;
}

export function SupplierFormEnderecos({ pessoaId }: SupplierFormEnderecosProps) {
  const { enderecos, createEndereco, updateEndereco, deleteEndereco, isLoading } = usePessoaEnderecos(pessoaId);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EnderecoLocal>({
    tipo_endereco: "principal",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    is_principal: false,
  });

  const resetForm = () => {
    setFormData({
      tipo_endereco: "principal",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      is_principal: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!pessoaId) return;
    
    const data: PessoaEnderecoInsert = {
      pessoa_id: pessoaId,
      ...formData,
    };

    if (editingId) {
      await updateEndereco.mutateAsync({ id: editingId, ...formData });
    } else {
      await createEndereco.mutateAsync(data);
    }
    resetForm();
  };

  const handleEdit = (endereco: any) => {
    setFormData({
      tipo_endereco: endereco.tipo_endereco,
      cep: endereco.cep || "",
      logradouro: endereco.logradouro || "",
      numero: endereco.numero || "",
      complemento: endereco.complemento || "",
      bairro: endereco.bairro || "",
      cidade: endereco.cidade || "",
      estado: endereco.estado || "",
      is_principal: endereco.is_principal,
    });
    setEditingId(endereco.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteEndereco.mutateAsync(id);
  };

  if (!pessoaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Salve o fornecedor primeiro para adicionar endereços.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Endereços</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Endereço
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Editar Endereço" : "Novo Endereço"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo_endereco}
                  onValueChange={(value) => setFormData({ ...formData, tipo_endereco: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_ENDERECO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={formData.logradouro}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_principal"
                  checked={formData.is_principal}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_principal: !!checked })}
                />
                <Label htmlFor="is_principal" className="cursor-pointer">Endereço Principal</Label>
              </div>
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

      {enderecos.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="text-center">Principal</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enderecos.map((endereco) => (
                  <TableRow key={endereco.id}>
                    <TableCell className="capitalize">{endereco.tipo_endereco}</TableCell>
                    <TableCell>
                      {endereco.logradouro}{endereco.numero ? `, ${endereco.numero}` : ""}
                      {endereco.complemento ? ` - ${endereco.complemento}` : ""}
                    </TableCell>
                    <TableCell>
                      {endereco.cidade && endereco.estado
                        ? `${endereco.cidade}/${endereco.estado}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {endereco.is_principal ? "✓" : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(endereco)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(endereco.id)}>
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

      {enderecos.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum endereço cadastrado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
