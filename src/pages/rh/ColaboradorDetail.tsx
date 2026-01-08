import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePessoas } from "@/hooks/usePessoas";
import { useColaboradorDocs, TIPOS_DOCUMENTO, TipoDocumento, getDocStatus } from "@/hooks/useColaboradorDocs";
import { useIntegracoes } from "@/hooks/useIntegracoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared";
import { ArrowLeft, Upload, RefreshCw, FileText, User, Calendar, CheckCircle, AlertTriangle, XCircle, Plus, Building2, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DOC_OBRIGATORIOS: TipoDocumento[] = ['ASO', 'NR10', 'NR35'];

function getStatusIcon(color: 'green' | 'yellow' | 'red' | 'gray') {
  switch (color) {
    case 'green': return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'yellow': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'red': return <XCircle className="h-5 w-5 text-red-600" />;
    default: return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusBg(color: 'green' | 'yellow' | 'red' | 'gray') {
  switch (color) {
    case 'green': return 'bg-green-50 border-green-200';
    case 'yellow': return 'bg-yellow-50 border-yellow-200';
    case 'red': return 'bg-red-50 border-red-200';
    default: return 'bg-muted/50 border-border';
  }
}

export default function ColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Estados para documentos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docTipo, setDocTipo] = useState<TipoDocumento | ''>('');
  const [docCustomizado, setDocCustomizado] = useState('');
  const [docEmissao, setDocEmissao] = useState('');
  const [docVencimento, setDocVencimento] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Estados para integrações
  const [intDialogOpen, setIntDialogOpen] = useState(false);
  const [intClienteId, setIntClienteId] = useState('');
  const [intDataRealizacao, setIntDataRealizacao] = useState(new Date().toISOString().split('T')[0]);
  const [intDataVencimento, setIntDataVencimento] = useState('');
  const [intObservacoes, setIntObservacoes] = useState('');
  const [editingIntId, setEditingIntId] = useState<string | null>(null);

  const { colaboradores, isLoadingColaboradores } = usePessoas();
  const { documentos, isLoading: isLoadingDocs, createDoc, updateDoc, deleteDoc } = useColaboradorDocs(id);
  const { 
    integracoes, 
    clientes, 
    createIntegracao, 
    updateIntegracao, 
    deleteIntegracao 
  } = useIntegracoes();

  const colaborador = colaboradores.find(c => c.id === id);
  
  // Filtrar integrações apenas deste colaborador
  const integracoesColaborador = integracoes.filter(i => i.colaborador_id === id);

  if (isLoadingColaboradores) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  if (!colaborador) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="outline" onClick={() => navigate('/rh/colaboradores')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center mt-10 text-muted-foreground">Colaborador não encontrado</div>
      </div>
    );
  }

  const nome = colaborador.nome_fantasia || colaborador.razao_social || 'Sem nome';

  // Handlers para documentos
  const handleOpenDocDialog = (tipo?: TipoDocumento, docId?: string) => {
    if (tipo && docId) {
      const doc = documentos.find(d => d.id === docId);
      if (doc) {
        setEditingDocId(docId);
        setDocTipo(doc.tipo);
        setDocCustomizado(doc.tipo_customizado || '');
        setDocEmissao(doc.data_emissao ? doc.data_emissao.split('T')[0] : '');
        setDocVencimento(doc.data_vencimento ? doc.data_vencimento.split('T')[0] : '');
      }
    } else if (tipo) {
      setEditingDocId(null);
      setDocTipo(tipo);
      setDocCustomizado('');
      setDocEmissao('');
      setDocVencimento('');
    } else {
      setEditingDocId(null);
      setDocTipo('');
      setDocCustomizado('');
      setDocEmissao('');
      setDocVencimento('');
    }
    setDialogOpen(true);
  };

  const handleSubmitDoc = async () => {
    if (!docTipo) return;
    if (docTipo === 'OUTROS' && !docCustomizado.trim()) return;

    if (editingDocId) {
      await updateDoc.mutateAsync({
        id: editingDocId,
        data: {
          tipo: docTipo,
          tipo_customizado: docTipo === 'OUTROS' ? docCustomizado : null,
          data_emissao: docEmissao || null,
          data_vencimento: docVencimento || null,
        },
      });
    } else {
      await createDoc.mutateAsync({
        colaborador_id: id!,
        tipo: docTipo,
        tipo_customizado: docTipo === 'OUTROS' ? docCustomizado : undefined,
        data_emissao: docEmissao || null,
        data_vencimento: docVencimento || null,
      });
    }
    setDialogOpen(false);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (confirm('Remover este documento?')) {
      await deleteDoc.mutateAsync(docId);
    }
  };

  // Handlers para integrações
  const handleOpenIntDialog = (integracao?: typeof integracoesColaborador[0]) => {
    if (integracao) {
      setEditingIntId(integracao.id);
      setIntClienteId(integracao.cliente_id);
      setIntDataRealizacao(integracao.data_realizacao);
      setIntDataVencimento(integracao.data_vencimento);
      setIntObservacoes(integracao.observacoes || '');
    } else {
      setEditingIntId(null);
      setIntClienteId('');
      setIntDataRealizacao(new Date().toISOString().split('T')[0]);
      setIntDataVencimento('');
      setIntObservacoes('');
    }
    setIntDialogOpen(true);
  };

  const handleSubmitInt = async () => {
    if (!intClienteId || !intDataVencimento) return;

    if (editingIntId) {
      await updateIntegracao.mutateAsync({
        id: editingIntId,
        data: {
          data_realizacao: intDataRealizacao,
          data_vencimento: intDataVencimento,
          observacoes: intObservacoes || null,
        },
      });
    } else {
      await createIntegracao.mutateAsync({
        colaborador_id: id!,
        cliente_id: intClienteId,
        data_realizacao: intDataRealizacao,
        data_vencimento: intDataVencimento,
        observacoes: intObservacoes || undefined,
      });
    }
    setIntDialogOpen(false);
  };

  const handleDeleteInt = async (intId: string) => {
    if (confirm('Remover esta integração?')) {
      await deleteIntegracao.mutateAsync(intId);
    }
  };

  // Mapear documentos por tipo
  const docsPorTipo: Record<string, typeof documentos[0] | undefined> = {};
  documentos.forEach(doc => {
    docsPorTipo[doc.tipo] = doc;
  });

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <PageHeader
        title="Prontuário do Colaborador"
        description="Documentação e integrações do colaborador"
        breadcrumbs={[
          { label: "RH" },
          { label: "Colaboradores", href: "/rh/colaboradores" },
          { label: nome },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/rh/colaboradores')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />

      {/* Cabeçalho do Colaborador */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{nome}</h2>
              <div className="flex gap-2 mt-1 flex-wrap">
                {colaborador.cargo && <Badge variant="secondary">{colaborador.cargo}</Badge>}
                {colaborador.cpf_cnpj && <Badge variant="outline">{colaborador.cpf_cnpj}</Badge>}
                <Badge variant={colaborador.is_active ? "default" : "destructive"}>
                  {colaborador.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Documentos e Integrações */}
      <Tabs defaultValue="documentos" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documentos">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="integracoes">
            <Building2 className="h-4 w-4 mr-2" />
            Integrações ({integracoesColaborador.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Documentos */}
        <TabsContent value="documentos" className="space-y-6">
          {/* Documentação Obrigatória */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentação Obrigatória
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {DOC_OBRIGATORIOS.map(tipo => {
                  const doc = docsPorTipo[tipo];
                  const status = doc ? getDocStatus(doc.data_vencimento) : { label: 'Não cadastrado', color: 'gray' as const, diasRestantes: null };

                  return (
                    <Card key={tipo} className={`border ${getStatusBg(status.color)}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{tipo}</h4>
                            {doc?.data_vencimento && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                Vence: {format(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          {getStatusIcon(status.color)}
                        </div>
                        <p className="text-sm font-medium mt-2">{status.label}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => doc ? handleOpenDocDialog(tipo, doc.id) : handleOpenDocDialog(tipo)}
                        >
                          {doc ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Renovar
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3 mr-2" />
                              Cadastrar
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Outros Documentos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Outros Documentos</CardTitle>
              <Button size="sm" onClick={() => handleOpenDocDialog()}>
                <Upload className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDocs ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : documentos.filter(d => !DOC_OBRIGATORIOS.includes(d.tipo as TipoDocumento)).length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Nenhum documento adicional cadastrado</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {documentos
                    .filter(d => !DOC_OBRIGATORIOS.includes(d.tipo as TipoDocumento))
                    .map(doc => {
                      const status = getDocStatus(doc.data_vencimento);
                      return (
                        <Card key={doc.id} className={`border ${getStatusBg(status.color)}`}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{doc.tipo_customizado || doc.tipo}</h4>
                                {doc.data_vencimento && (
                                  <p className="text-sm text-muted-foreground">
                                    Vence: {format(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                              {getStatusIcon(status.color)}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenDocDialog(doc.tipo as TipoDocumento, doc.id)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Renovar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteDoc(doc.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Integrações */}
        <TabsContent value="integracoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Integrações em Unidades
              </CardTitle>
              <Button size="sm" onClick={() => handleOpenIntDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            </CardHeader>
            <CardContent>
              {integracoesColaborador.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma integração cadastrada para este colaborador</p>
                  <Button className="mt-4" onClick={() => handleOpenIntDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Integração
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente/Unidade</TableHead>
                      <TableHead>Data Realização</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integracoesColaborador.map(int => (
                      <TableRow key={int.id}>
                        <TableCell className="font-medium">
                          {int.cliente?.nome_fantasia || int.cliente?.razao_social || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(int.data_realizacao), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(int.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={int.statusFinal === 'ATIVO' ? 'default' : 'destructive'}
                            className={int.statusFinal === 'ATIVO' ? 'bg-green-600' : int.statusFinal === 'A_VENCER' ? 'bg-yellow-600' : ''}
                          >
                            {int.statusFinal === 'ATIVO' && 'Ativo'}
                            {int.statusFinal === 'A_VENCER' && 'A Vencer'}
                            {int.statusFinal === 'VENCIDO' && 'Vencido'}
                            {int.statusFinal === 'BLOQUEADO' && '⛔ Bloqueado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenIntDialog(int)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteInt(int.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDocId ? 'Renovar Documento' : 'Novo Documento'}</DialogTitle>
            <DialogDescription>
              {editingDocId ? 'Atualize as informações do documento' : 'Cadastre um novo documento'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo de Documento</Label>
              <Select 
                value={docTipo} 
                onValueChange={(v) => setDocTipo(v as TipoDocumento)}
                disabled={!!editingDocId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {docTipo === 'OUTROS' && (
              <div className="grid gap-2">
                <Label>Nome do Documento</Label>
                <Input 
                  value={docCustomizado}
                  onChange={(e) => setDocCustomizado(e.target.value)}
                  placeholder="Ex: Treinamento Segurança"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de Emissão</Label>
                <Input 
                  type="date"
                  value={docEmissao}
                  onChange={(e) => setDocEmissao(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Data de Vencimento</Label>
                <Input 
                  type="date"
                  value={docVencimento}
                  onChange={(e) => setDocVencimento(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitDoc}
              disabled={!docTipo || (docTipo === 'OUTROS' && !docCustomizado.trim()) || createDoc.isPending || updateDoc.isPending}
            >
              {editingDocId ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Integração */}
      <Dialog open={intDialogOpen} onOpenChange={setIntDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIntId ? 'Renovar Integração' : 'Nova Integração'}</DialogTitle>
            <DialogDescription>
              {editingIntId ? 'Atualize a validade da integração' : 'Cadastre uma nova integração em uma unidade'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Cliente/Unidade</Label>
              <Select 
                value={intClienteId} 
                onValueChange={setIntClienteId}
                disabled={!!editingIntId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data Realização</Label>
                <Input 
                  type="date"
                  value={intDataRealizacao}
                  onChange={(e) => setIntDataRealizacao(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Data Validade</Label>
                <Input 
                  type="date"
                  value={intDataVencimento}
                  onChange={(e) => setIntDataVencimento(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input 
                value={intObservacoes}
                onChange={(e) => setIntObservacoes(e.target.value)}
                placeholder="Observações opcionais"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIntDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitInt}
              disabled={!intClienteId || !intDataVencimento || createIntegracao.isPending || updateIntegracao.isPending}
            >
              {editingIntId ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
