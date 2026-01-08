import { useState } from "react";
import { usePessoas, Pessoa, PessoaInsert } from "@/hooks/usePessoas";
import { useRhDocumentos, TIPOS_DOCUMENTO, getStatusDocumento } from "@/hooks/useRh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, Edit, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared";

interface DocTemp {
  tipo: string;
  dataVencimento: string;
}

export default function RhColaboradoresPage() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Pessoa | null>(null);
  const [docRenovar, setDocRenovar] = useState<any>(null);
  const [novaDataVencimento, setNovaDataVencimento] = useState("");
  const [documentosTemp, setDocumentosTemp] = useState<DocTemp[]>([]);
  const [novoDoc, setNovoDoc] = useState({ tipo: "", tipoCustomizado: "", dataVencimento: "" });
  
  const [formData, setFormData] = useState({
    tipo_pessoa: "PJ" as "PF" | "PJ",
    razao_social: "",
    nome_fantasia: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
    cargo: "",
    departamento: "",
  });

  const { 
    colaboradores, 
    isLoadingColaboradores, 
    createPessoa, 
    updatePessoa, 
    toggleStatus 
  } = usePessoas();
  
  const { createDocumento, updateDocumento, deleteDocumento } = useRhDocumentos();

  const fecharDialog = () => {
    setDialogAberto(false);
    setColaboradorSelecionado(null);
    setFormData({
      tipo_pessoa: "PJ",
      razao_social: "",
      nome_fantasia: "",
      cpf_cnpj: "",
      email: "",
      telefone: "",
      cargo: "",
      departamento: "",
    });
    setDocumentosTemp([]);
    setNovoDoc({ tipo: "", tipoCustomizado: "", dataVencimento: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.razao_social?.trim()) {
      toast.error("Preencha o nome do colaborador");
      return;
    }

    try {
      if (colaboradorSelecionado) {
        await updatePessoa.mutateAsync({
          id: colaboradorSelecionado.id,
          data: formData,
        });
        // Criar novos documentos
        for (const doc of documentosTemp) {
          await createDocumento.mutateAsync({
            colaborador_id: colaboradorSelecionado.id,
            tipo_documento: doc.tipo,
            data_vencimento: doc.dataVencimento,
          });
        }
      } else {
        await createPessoa.mutateAsync({
          ...formData,
          is_colaborador: true,
        });
      }
      fecharDialog();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const adicionarDocumento = () => {
    if (!novoDoc.tipo || !novoDoc.dataVencimento) {
      toast.error("Preencha tipo e vencimento do documento");
      return;
    }

    if (novoDoc.tipo === "Outros" && !novoDoc.tipoCustomizado) {
      toast.error("Digite o nome do documento");
      return;
    }

    const tipoFinal = novoDoc.tipo === "Outros" ? novoDoc.tipoCustomizado : novoDoc.tipo;
    setDocumentosTemp([...documentosTemp, { tipo: tipoFinal, dataVencimento: novoDoc.dataVencimento }]);
    setNovoDoc({ tipo: "", tipoCustomizado: "", dataVencimento: "" });
    toast.success("Documento adicionado à lista!");
  };

  const removerDocumentoTemp = (index: number) => {
    setDocumentosTemp(documentosTemp.filter((_, i) => i !== index));
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
      departamento: colab.departamento || "",
    });
    setDialogAberto(true);
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleStatus.mutate({ id, is_active: isActive });
  };

  const handleRenovar = () => {
    if (!novaDataVencimento) {
      toast.error("Selecione a nova data de vencimento");
      return;
    }

    updateDocumento.mutate({
      id: docRenovar.id,
      data: { data_vencimento: novaDataVencimento },
    });
    setDocRenovar(null);
    setNovaDataVencimento("");
  };

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

      <div className="grid gap-4 mt-6">
        {colaboradores?.filter((c) => c.is_active).map((colab) => (
          <ColaboradorCard
            key={colab.id}
            colaborador={colab}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onRenovar={(doc: any) => {
              setDocRenovar(doc);
              setNovaDataVencimento(new Date(doc.data_vencimento).toISOString().split('T')[0]);
            }}
            onDeleteDocumento={(id: string) => {
              if (confirm("Remover documento?")) deleteDocumento.mutate(id);
            }}
          />
        ))}
      </div>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{colaboradorSelecionado ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do colaborador e adicione seus documentos
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
                  <Label>{formData.tipo_pessoa === "PF" ? "Nome Completo" : "Razão Social"}</Label>
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
                  <Label>Cargo/Função</Label>
                  <Input
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Departamento</Label>
                  <Input
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Documentos do Colaborador</h3>

                <div className="grid gap-3 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="grid gap-2">
                      <Label>Tipo de Documento</Label>
                      <Select value={novoDoc.tipo} onValueChange={(v) => setNovoDoc({ ...novoDoc, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_DOCUMENTO.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {novoDoc.tipo === "Outros" && (
                      <div className="grid gap-2">
                        <Label>Nome do Documento</Label>
                        <Input
                          placeholder="Digite o nome"
                          value={novoDoc.tipoCustomizado}
                          onChange={(e) => setNovoDoc({ ...novoDoc, tipoCustomizado: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label>Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={novoDoc.dataVencimento}
                        onChange={(e) => setNovoDoc({ ...novoDoc, dataVencimento: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button type="button" onClick={adicionarDocumento} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {documentosTemp.length > 0 && (
                  <div className="border rounded-lg p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documentosTemp.map((doc, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{doc.tipo}</TableCell>
                            <TableCell>{new Date(doc.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removerDocumentoTemp(idx)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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

      {/* Dialog de Renovação */}
      <Dialog open={!!docRenovar} onOpenChange={() => setDocRenovar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Documento</DialogTitle>
            <DialogDescription>
              Atualize a data de vencimento do documento {docRenovar?.tipo_documento}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nova Data de Vencimento</Label>
              <Input
                type="date"
                value={novaDataVencimento}
                onChange={(e) => setNovaDataVencimento(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDocRenovar(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRenovar} disabled={updateDocumento.isPending}>
              Renovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente separado para card de colaborador
function ColaboradorCard({ colaborador, onEdit, onToggleStatus, onRenovar, onDeleteDocumento }: {
  colaborador: Pessoa;
  onEdit: (c: Pessoa) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onRenovar: (doc: any) => void;
  onDeleteDocumento: (id: string) => void;
}) {
  const { documentos, isLoading } = useRhDocumentos(colaborador.id);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">Carregando documentos...</div>
        </CardContent>
      </Card>
    );
  }

  const temDocVencido = documentos?.some((d) => {
    if (!d.data_vencimento) return false;
    return new Date(d.data_vencimento) < new Date();
  });

  const temDocVencendo = documentos?.some((d) => {
    if (!d.data_vencimento) return false;
    const diffDias = Math.ceil((new Date(d.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDias >= 0 && diffDias <= 30;
  });

  const nome = colaborador.nome_fantasia || colaborador.razao_social || "Sem nome";

  return (
    <Card className={temDocVencido ? 'border-red-300 bg-red-50' : temDocVencendo ? 'border-yellow-300 bg-yellow-50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{nome}</CardTitle>
            {colaborador.cpf_cnpj && (
              <Badge variant="outline">{colaborador.cpf_cnpj}</Badge>
            )}
            {colaborador.cargo && (
              <Badge variant="secondary">{colaborador.cargo}</Badge>
            )}
            {temDocVencido && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Documentos Vencidos
              </Badge>
            )}
            {!temDocVencido && temDocVencendo && (
              <Badge className="bg-yellow-600 gap-1">
                <AlertCircle className="h-3 w-3" />
                Documentos Vencendo
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(colaborador)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onToggleStatus(colaborador.id, !colaborador.is_active)}
            >
              {colaborador.is_active ? (
                <PowerOff className="h-4 w-4 text-red-600" />
              ) : (
                <Power className="h-4 w-4 text-green-600" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {documentos && documentos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {documentos.map((doc) => {
              const status = getStatusDocumento(doc.data_vencimento);
              const precisaRenovar = status && (status.label === "Vencido" || status.label === "Vencendo");

              return (
                <div key={doc.id} className="flex flex-col gap-1 p-3 border rounded-lg bg-background relative">
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      onClick={() => onDeleteDocumento(doc.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                      title="Remover documento"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pr-6">
                    <Badge variant="outline" className="text-xs">{doc.tipo_documento}</Badge>
                    {status && (
                      <Badge variant={status.variant} className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {doc.data_vencimento
                      ? new Date(doc.data_vencimento).toLocaleDateString("pt-BR")
                      : "Sem vencimento"}
                  </span>
                  {precisaRenovar && (
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => onRenovar(doc)}>
                      Renovar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum documento cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
