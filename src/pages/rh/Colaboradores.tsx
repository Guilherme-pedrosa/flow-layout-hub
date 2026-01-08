import { useState } from "react";
import { useRhColaboradores, useRhDocumentos, TIPOS_DOCUMENTO, getStatusDocumento } from "@/hooks/useRh";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, Edit, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Documento {
  tipo: string;
  dataVencimento: string;
}

export default function RhColaboradoresPage() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<any>(null);
  const [docRenovar, setDocRenovar] = useState<any>(null);
  const [novaDataVencimento, setNovaDataVencimento] = useState("");
  const [formData, setFormData] = useState({ nome: "" });
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [novoDoc, setNovoDoc] = useState({ tipo: "", tipoCustomizado: "", dataVencimento: "" });

  const { colaboradores, isLoading, createColaborador, updateColaborador, deleteColaborador } = useRhColaboradores();
  const { createDocumento, updateDocumento, deleteDocumento } = useRhDocumentos();

  const fecharDialog = () => {
    setDialogAberto(false);
    setColaboradorSelecionado(null);
    setFormData({ nome: "" });
    setDocumentos([]);
    setNovoDoc({ tipo: "", tipoCustomizado: "", dataVencimento: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Preencha o nome do técnico");
      return;
    }

    if (colaboradorSelecionado) {
      await updateColaborador.mutateAsync({
        id: colaboradorSelecionado.id,
        data: { nome: formData.nome },
      });
      // Criar novos documentos
      for (const doc of documentos) {
        await createDocumento.mutateAsync({
          colaborador_id: colaboradorSelecionado.id,
          tipo_documento: doc.tipo,
          data_vencimento: doc.dataVencimento,
        });
      }
    } else {
      // Criar colaborador e depois documentos
      await createColaborador.mutateAsync({ nome: formData.nome, ativo: 1 });
    }
    fecharDialog();
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
    setDocumentos([...documentos, { tipo: tipoFinal, dataVencimento: novoDoc.dataVencimento }]);
    setNovoDoc({ tipo: "", tipoCustomizado: "", dataVencimento: "" });
    toast.success("Documento adicionado à lista!");
  };

  const removerDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este técnico?")) {
      deleteColaborador.mutate(id);
    }
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Técnicos</h1>
          <p className="text-muted-foreground">Gerenciar Técnicos e seus documentos</p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Técnico
        </Button>
      </div>

      <div className="grid gap-4">
        {colaboradores?.filter((c) => c.ativo === 1).map((colab) => (
          <ColaboradorCard
            key={colab.id}
            colaborador={colab}
            onEdit={(c: any) => {
              setColaboradorSelecionado(c);
              setFormData({ nome: c.nome });
              setDialogAberto(true);
            }}
            onDelete={handleDelete}
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
            <DialogTitle>{colaboradorSelecionado ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do técnico e adicione seus documentos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome do Técnico</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ nome: e.target.value })}
                  required
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Documentos do Técnico</h3>

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

                {documentos.length > 0 && (
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
                        {documentos.map((doc, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{doc.tipo}</TableCell>
                            <TableCell>{new Date(doc.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removerDocumento(idx)}>
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
              <Button type="submit" disabled={createColaborador.isPending || updateColaborador.isPending}>
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
function ColaboradorCard({ colaborador, onEdit, onDelete, onRenovar, onDeleteDocumento }: any) {
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

  return (
    <Card className={temDocVencido ? 'border-red-300 bg-red-50' : temDocVencendo ? 'border-yellow-300 bg-yellow-50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{colaborador.nome}</CardTitle>
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
            <Button variant="outline" size="sm" onClick={() => onDelete(colaborador.id)}>
              <Trash2 className="h-4 w-4" />
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
