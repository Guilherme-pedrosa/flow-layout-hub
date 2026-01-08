import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePessoas, Pessoa, PessoaInsert } from "@/hooks/usePessoas";
import { useAllColaboradorDocs, getDocStatus } from "@/hooks/useColaboradorDocs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Power, PowerOff, FileText, AlertCircle, CheckCircle, Eye, Search } from "lucide-react";
import { PageHeader } from "@/components/shared";

export default function RhColaboradoresPage() {
  const navigate = useNavigate();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Pessoa | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ativos');
  
  const [formData, setFormData] = useState({
    tipo_pessoa: "PF" as "PF" | "PJ",
    razao_social: "",
    nome_fantasia: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
    cargo: "",
    funcao: "",
    departamento: "",
  });

  const { 
    colaboradores, 
    isLoadingColaboradores, 
    createPessoa, 
    updatePessoa, 
    toggleStatus 
  } = usePessoas();

  const { documentos: allDocs } = useAllColaboradorDocs();

  const fecharDialog = () => {
    setDialogAberto(false);
    setColaboradorSelecionado(null);
    setFormData({
      tipo_pessoa: "PF",
      razao_social: "",
      nome_fantasia: "",
      cpf_cnpj: "",
      email: "",
      telefone: "",
      cargo: "",
      funcao: "",
      departamento: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.razao_social?.trim()) {
      return;
    }

    try {
      if (colaboradorSelecionado) {
        await updatePessoa.mutateAsync({
          id: colaboradorSelecionado.id,
          data: formData,
        });
      } else {
        await createPessoa.mutateAsync({
          ...formData,
          is_colaborador: true,
        });
      }
      fecharDialog();
    } catch {
      // Error handled by mutation
    }
  };

  const handleEdit = (colab: Pessoa) => {
    setColaboradorSelecionado(colab);
    setFormData({
      tipo_pessoa: colab.tipo_pessoa as "PF" | "PJ",
      razao_social: colab.razao_social || "",
      nome_fantasia: colab.nome_fantasia || "",
      cpf_cnpj: colab.cpf_cnpj || "",
      email: colab.email || "",
      telefone: colab.telefone || "",
      cargo: colab.cargo || "",
      funcao: (colab as any).funcao || "",
      departamento: colab.departamento || "",
    });
    setDialogAberto(true);
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleStatus.mutate({ id, is_active: isActive });
  };

  // Verificar status de documentos para cada colaborador
  const getColabDocStatus = (colaboradorId: string) => {
    const docs = allDocs.filter(d => d.colaborador_id === colaboradorId);
    if (docs.length === 0) return { status: 'none', label: 'Sem docs', color: 'gray' as const };
    
    const vencidos = docs.filter(d => {
      const s = getDocStatus(d.data_vencimento);
      return s.diasRestantes !== null && s.diasRestantes < 0;
    });
    
    const aVencer = docs.filter(d => {
      const s = getDocStatus(d.data_vencimento);
      return s.diasRestantes !== null && s.diasRestantes >= 0 && s.diasRestantes <= 30;
    });

    if (vencidos.length > 0) {
      return { status: 'vencido', label: `${vencidos.length} vencido(s)`, color: 'red' as const };
    }
    if (aVencer.length > 0) {
      return { status: 'alerta', label: `${aVencer.length} vencendo`, color: 'yellow' as const };
    }
    return { status: 'ok', label: 'Em dia', color: 'green' as const };
  };

  // Filtrar colaboradores
  const colaboradoresFiltrados = colaboradores.filter(c => {
    const nome = c.nome_fantasia || c.razao_social || '';
    const matchSearch = !search || nome.toLowerCase().includes(search.toLowerCase()) || c.cpf_cnpj?.includes(search);
    
    let matchStatus = true;
    if (filterStatus === 'ativos') matchStatus = c.is_active === true;
    else if (filterStatus === 'inativos') matchStatus = c.is_active === false;
    
    return matchSearch && matchStatus;
  });

  if (isLoadingColaboradores) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Colaboradores"
        description="Cadastro de colaboradores (PF/PJ) com controle de documentos"
        breadcrumbs={[
          { label: "RH" },
          { label: "Colaboradores" },
        ]}
        actions={
          <Button onClick={() => setDialogAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="mt-6">
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nome ou CPF/CNPJ..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Colaboradores */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cargo/Função</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradoresFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nenhum colaborador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                colaboradoresFiltrados.map(colab => {
                  const nome = colab.nome_fantasia || colab.razao_social || 'Sem nome';
                  const docStatus = getColabDocStatus(colab.id);

                  return (
                    <TableRow key={colab.id}>
                      <TableCell className="font-medium">{nome}</TableCell>
                      <TableCell>{colab.cpf_cnpj || '-'}</TableCell>
                      <TableCell>{colab.cargo || (colab as any).funcao || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={docStatus.color === 'green' ? 'default' : docStatus.color === 'yellow' ? 'secondary' : 'destructive'}
                          className={docStatus.color === 'green' ? 'bg-green-600' : docStatus.color === 'yellow' ? 'bg-yellow-600' : docStatus.color === 'gray' ? 'bg-gray-400' : ''}
                        >
                          {docStatus.color === 'green' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {docStatus.color === 'red' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {docStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={colab.is_active ? 'default' : 'secondary'}>
                          {colab.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/rh/colaboradores/${colab.id}`)}
                            title="Ver prontuário"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(colab)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleToggleStatus(colab.id, !colab.is_active)}
                            title={colab.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {colab.is_active ? (
                              <PowerOff className="h-4 w-4 text-red-600" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{colaboradorSelecionado ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do colaborador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo Pessoa</Label>
                  <Select
                    value={formData.tipo_pessoa}
                    onValueChange={(v) => setFormData({ ...formData, tipo_pessoa: v as "PF" | "PJ" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">Pessoa Física</SelectItem>
                      <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{formData.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}</Label>
                  <Input
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{formData.tipo_pessoa === "PF" ? "Nome Completo" : "Razão Social"} *</Label>
                  <Input
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nome Fantasia / Apelido</Label>
                  <Input
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Cargo</Label>
                  <Input
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Função (Ex: Mecânico)</Label>
                  <Input
                    value={formData.funcao}
                    onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Departamento</Label>
                <Input
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPessoa.isPending || updatePessoa.isPending}>
                {colaboradorSelecionado ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
