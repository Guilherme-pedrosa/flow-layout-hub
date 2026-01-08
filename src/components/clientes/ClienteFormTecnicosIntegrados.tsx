import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  UserPlus, Download, Upload, Edit2, Trash2, ChevronDown, ChevronRight,
  FileText, Shield, ShieldCheck, ShieldAlert, ShieldX, AlertCircle,
  Calendar, Paperclip, Ban, CheckCircle, RefreshCcw, Loader2, User,
  Mail, Send, Clock, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useClienteAcesso, TecnicoAcesso } from "@/hooks/useClienteAcesso";
import { useAllColaboradorDocs, ColaboradorDoc, getDocStatus } from "@/hooks/useColaboradorDocs";
import { useClienteEnviosDocs, EnvioDoc } from "@/hooks/useClienteEnviosDocs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clienteId: string;
  exigeIntegracao: boolean;
  regrasAcesso: string;
  emailPortaria?: string;
  onConfigChange: (exige: boolean, regras: string) => void;
}

// Status calculado do semáforo inteligente (Dual-Layer)
type StatusBlindagem = 'LIBERADO' | 'BLOQUEADO_DOC' | 'BLOQUEADO_INT' | 'ATENCAO' | 'BLOQUEADO_MANUAL';

interface TecnicoComBlindagem extends TecnicoAcesso {
  statusBlindagem: StatusBlindagem;
  motivoBlindagem: string;
  docsGlobais: {
    tipo: string;
    dataVencimento: string | null;
    arquivoUrl: string | null;
    status: ReturnType<typeof getDocStatus>;
  }[];
}

interface DocEnvio {
  tipo: string;
  nome: string;
  url: string;
  selecionado: boolean;
}

const DOCS_OBRIGATORIOS = ['ASO', 'NR10', 'NR35'];

function calcularBlindagem(
  tecnico: TecnicoAcesso,
  docsColaborador: ColaboradorDoc[]
): TecnicoComBlindagem {
  const docsGlobais = DOCS_OBRIGATORIOS.map(tipo => {
    const doc = docsColaborador.find(d => d.tipo === tipo);
    return {
      tipo,
      dataVencimento: doc?.data_vencimento || null,
      arquivoUrl: doc?.arquivo_url || null,
      status: getDocStatus(doc?.data_vencimento || null),
    };
  });

  // 1. Bloqueio manual
  if (tecnico.is_blocked) {
    return {
      ...tecnico,
      statusBlindagem: 'BLOQUEADO_MANUAL',
      motivoBlindagem: tecnico.motivo_bloqueio || 'Acesso bloqueado manualmente',
      docsGlobais,
    };
  }

  // 2. Verificar integração local (Camada Local - "O Visto")
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validadeIntegracao = new Date(tecnico.data_validade);
  validadeIntegracao.setHours(0, 0, 0, 0);
  const diasIntegracao = Math.ceil((validadeIntegracao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diasIntegracao < 0) {
    return {
      ...tecnico,
      statusBlindagem: 'BLOQUEADO_INT',
      motivoBlindagem: `Integração local vencida há ${Math.abs(diasIntegracao)} dias`,
      docsGlobais,
    };
  }

  // 3. Verificar documentos globais (Camada Global - "O Passaporte")
  const docVencido = docsGlobais.find(d => d.status.diasRestantes !== null && d.status.diasRestantes < 0);
  if (docVencido) {
    return {
      ...tecnico,
      statusBlindagem: 'BLOQUEADO_DOC',
      motivoBlindagem: `${docVencido.tipo} vencido há ${Math.abs(docVencido.status.diasRestantes!)} dias`,
      docsGlobais,
    };
  }

  // 4. Verificar atenção (< 30 dias para vencer)
  const alertas: string[] = [];
  if (diasIntegracao <= 30) {
    alertas.push(`Integração vence em ${diasIntegracao}d`);
  }
  docsGlobais.forEach(d => {
    if (d.status.diasRestantes !== null && d.status.diasRestantes <= 30 && d.status.diasRestantes >= 0) {
      alertas.push(`${d.tipo} vence em ${d.status.diasRestantes}d`);
    }
  });
  
  if (alertas.length > 0) {
    return {
      ...tecnico,
      statusBlindagem: 'ATENCAO',
      motivoBlindagem: alertas.join(' | '),
      docsGlobais,
    };
  }

  // 5. Tudo OK
  return {
    ...tecnico,
    statusBlindagem: 'LIBERADO',
    motivoBlindagem: 'Integração e documentos em dia',
    docsGlobais,
  };
}

function StatusBadge({ status }: { status: StatusBlindagem }) {
  const config = {
    LIBERADO: { label: '🟢 LIBERADO', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    BLOQUEADO_DOC: { label: '🔴 BLOQUEADO (DOC)', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    BLOQUEADO_INT: { label: '🔴 BLOQUEADO (INT)', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    BLOQUEADO_MANUAL: { label: '🔴 BLOQUEADO', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    ATENCAO: { label: '⚠️ ATENÇÃO', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  };

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={`${className} font-semibold px-3 py-1`}>
      {label}
    </Badge>
  );
}

export function ClienteFormTecnicosIntegrados({
  clienteId,
  exigeIntegracao,
  regrasAcesso,
  emailPortaria,
  onConfigChange,
}: Props) {
  const { 
    tecnicos, isLoading, addTecnico, updateTecnico, 
    revogarAcesso, reativarAcesso, deleteTecnico, 
    colaboradoresDisponiveis, allColaboradores 
  } = useClienteAcesso(clienteId);
  const { documentos: todosDocumentos } = useAllColaboradorDocs();
  const { registrarEnvio, getUltimoEnvio } = useClienteEnviosDocs(clienteId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [envioDialogOpen, setEnvioDialogOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<TecnicoAcesso | null>(null);
  const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
  const [tecnicoParaEnvio, setTecnicoParaEnvio] = useState<TecnicoComBlindagem | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Form state (add/edit)
  const [selectedColaborador, setSelectedColaborador] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Form state (envio)
  const [emailDestinatario, setEmailDestinatario] = useState('');
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [docsParaEnvio, setDocsParaEnvio] = useState<DocEnvio[]>([]);

  // Enriquecer técnicos com dados de blindagem (Dual-Layer)
  const tecnicosComBlindagem: TecnicoComBlindagem[] = tecnicos.map(t => {
    const docsColaborador = todosDocumentos.filter(d => d.colaborador_id === t.colaborador_id);
    return calcularBlindagem(t, docsColaborador);
  });

  // Estatísticas
  const stats = {
    liberados: tecnicosComBlindagem.filter(t => t.statusBlindagem === 'LIBERADO').length,
    atencao: tecnicosComBlindagem.filter(t => t.statusBlindagem === 'ATENCAO').length,
    bloqueados: tecnicosComBlindagem.filter(t => 
      ['BLOQUEADO_DOC', 'BLOQUEADO_INT', 'BLOQUEADO_MANUAL'].includes(t.statusBlindagem)
    ).length,
  };

  // Verificar docs do colaborador selecionado (para o dialog)
  const docsColaboradorSelecionado = todosDocumentos.filter(d => d.colaborador_id === selectedColaborador);
  const docsSummary = DOCS_OBRIGATORIOS.map(tipo => {
    const doc = docsColaboradorSelecionado.find(d => d.tipo === tipo);
    return {
      tipo,
      existe: !!doc,
      validade: doc?.data_vencimento,
      status: getDocStatus(doc?.data_vencimento || null),
    };
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddOrEdit = async () => {
    if (!selectedColaborador || !dataValidade) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingTecnico) {
        await updateTecnico.mutateAsync({
          id: editingTecnico.id,
          data: { data_validade: dataValidade, observacoes: observacoes || null },
        });
      } else {
        await addTecnico.mutateAsync({
          colaborador_id: selectedColaborador,
          data_validade: dataValidade,
          observacoes,
        });
      }
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadComprovante = async (tecnicoId: string, file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clienteId}/${tecnicoId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('integracao-comprovantes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('integracao-comprovantes')
        .getPublicUrl(fileName);

      await updateTecnico.mutateAsync({
        id: tecnicoId,
        data: { comprovante_url: urlData.publicUrl, nome_arquivo: file.name },
      });
      
      toast.success('Comprovante enviado!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleBaixarKit = async (tecnico: TecnicoComBlindagem) => {
    const urls: { url: string; nome: string }[] = [];
    
    // Comprovante da integração local
    if (tecnico.comprovante_url) {
      urls.push({ url: tecnico.comprovante_url, nome: `Integracao_${tecnico.nome_arquivo || 'comprovante'}` });
    }
    
    // Documentos globais
    tecnico.docsGlobais.forEach(doc => {
      if (doc.arquivoUrl) {
        urls.push({ url: doc.arquivoUrl, nome: `${doc.tipo}_${tecnico.colaborador?.razao_social || 'tecnico'}` });
      }
    });

    if (urls.length === 0) {
      toast.error('Nenhum documento disponível para download');
      return;
    }

    // Abrir cada documento em nova aba
    urls.forEach(u => window.open(u.url, '_blank'));
    toast.success(`${urls.length} documento(s) aberto(s) para download`);
  };

  const resetForm = () => {
    setSelectedColaborador('');
    setDataValidade('');
    setObservacoes('');
    setPendingFile(null);
    setEditingTecnico(null);
  };

  const openEditDialog = (tecnico: TecnicoAcesso) => {
    setEditingTecnico(tecnico);
    setSelectedColaborador(tecnico.colaborador_id);
    setDataValidade(tecnico.data_validade);
    setObservacoes(tecnico.observacoes || '');
    setDialogOpen(true);
  };

  const confirmDelete = (id: string) => {
    setTecnicoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (tecnicoToDelete) {
      await deleteTecnico.mutateAsync(tecnicoToDelete);
      setDeleteDialogOpen(false);
      setTecnicoToDelete(null);
    }
  };

  // === FUNÇÕES DE ENVIO ===
  const abrirModalEnvio = (tecnico: TecnicoComBlindagem) => {
    // Verificar se há docs bloqueados
    const docVencido = tecnico.docsGlobais.find(d => d.status.diasRestantes !== null && d.status.diasRestantes < 0);
    const intVencida = (() => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const validade = new Date(tecnico.data_validade);
      validade.setHours(0, 0, 0, 0);
      return validade < hoje;
    })();

    if (docVencido || intVencida || tecnico.is_blocked) {
      toast.error('Não é possível enviar: técnico está bloqueado ou com documentos vencidos.');
      return;
    }

    // Preparar lista de documentos disponíveis
    const docs: DocEnvio[] = [];
    
    // Comprovante integração
    if (tecnico.comprovante_url) {
      docs.push({
        tipo: 'Integração',
        nome: tecnico.nome_arquivo || 'Comprovante de Integração',
        url: tecnico.comprovante_url,
        selecionado: true,
      });
    }

    // Documentos globais
    tecnico.docsGlobais.forEach(doc => {
      if (doc.arquivoUrl) {
        docs.push({
          tipo: doc.tipo,
          nome: `${doc.tipo}.pdf`,
          url: doc.arquivoUrl,
          selecionado: true,
        });
      }
    });

    if (docs.length === 0) {
      toast.error('Nenhum documento disponível para envio. Anexe os documentos primeiro.');
      return;
    }

    setTecnicoParaEnvio(tecnico);
    setDocsParaEnvio(docs);
    setEmailDestinatario(emailPortaria || '');
    setAssuntoEmail(`Documentação de Acesso - ${tecnico.colaborador?.razao_social || 'Técnico'} - ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`);
    setEnvioDialogOpen(true);
  };

  const toggleDocEnvio = (idx: number) => {
    setDocsParaEnvio(prev => prev.map((d, i) => 
      i === idx ? { ...d, selecionado: !d.selecionado } : d
    ));
  };

  const handleEnviarEmail = async () => {
    if (!tecnicoParaEnvio) return;
    
    const docsSelecionados = docsParaEnvio.filter(d => d.selecionado);
    if (docsSelecionados.length === 0) {
      toast.error('Selecione pelo menos um documento.');
      return;
    }

    if (!emailDestinatario.trim()) {
      toast.error('Informe o e-mail do destinatário.');
      return;
    }

    setEnviando(true);
    try {
      // Montar corpo do e-mail
      const corpoEmail = `Prezados,

Seguem os documentos para liberação de acesso do técnico ${tecnicoParaEnvio.colaborador?.razao_social || 'Técnico'}:

${docsSelecionados.map(d => `• ${d.tipo}: ${d.nome}`).join('\n')}

LINKS PARA DOWNLOAD:
${docsSelecionados.map(d => `${d.tipo}: ${d.url}`).join('\n')}

Atenciosamente,
Equipe WeDo`;

      // Abrir cliente de e-mail via mailto
      const mailtoUrl = `mailto:${encodeURIComponent(emailDestinatario)}?subject=${encodeURIComponent(assuntoEmail)}&body=${encodeURIComponent(corpoEmail)}`;
      window.open(mailtoUrl, '_blank');

      // Registrar o envio no banco
      const { data: user } = await supabase.auth.getUser();
      await registrarEnvio.mutateAsync({
        colaborador_id: tecnicoParaEnvio.colaborador_id,
        destinatario_email: emailDestinatario,
        assunto: assuntoEmail,
        documentos_enviados: docsSelecionados.map(d => ({ tipo: d.tipo, nome: d.nome })),
        enviado_por_nome: user?.user?.email || null,
      });

      toast.success('E-mail preparado! Complete o envio no seu cliente de e-mail.');
      setEnvioDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar o envio.');
    } finally {
      setEnviando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuração da Unidade */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Esta unidade exige integração?</Label>
            <p className="text-sm text-muted-foreground">
              Se habilitado, apenas técnicos com integração válida poderão atender este cliente.
            </p>
          </div>
          <Switch
            checked={exigeIntegracao}
            onCheckedChange={(checked) => onConfigChange(checked, regrasAcesso)}
          />
        </div>

        {!exigeIntegracao && (
          <Alert className="border-emerald-500/50 bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-600">
              <strong>Acesso Livre</strong> — Qualquer técnico com ASO em dia pode atender esta unidade.
            </AlertDescription>
          </Alert>
        )}

        {exigeIntegracao && (
          <div className="space-y-2">
            <Label>Instruções/Regras de Acesso</Label>
            <Textarea
              placeholder="Ex: Portaria pede ASO e CNH impressos. Procurar Sr. Carlos."
              value={regrasAcesso}
              onChange={(e) => onConfigChange(exigeIntegracao, e.target.value)}
              rows={3}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Cabeçalho com estatísticas e botão de adicionar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Controle de Acesso</h3>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="text-emerald-600">🟢 {stats.liberados} liberados</span>
            <span className="text-amber-600">⚠️ {stats.atencao} atenção</span>
            <span className="text-destructive">🔴 {stats.bloqueados} bloqueados</span>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Vincular Técnico
        </Button>
      </div>

      {/* Lista de técnicos com Accordion Expansível */}
      {tecnicosComBlindagem.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum técnico vinculado a esta unidade.</p>
          <p className="text-sm">Clique em "Vincular Técnico" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tecnicosComBlindagem.map((tecnico) => (
            <Collapsible
              key={tecnico.id}
              open={expandedRows.has(tecnico.id)}
              onOpenChange={() => toggleRow(tecnico.id)}
            >
              <div className="border rounded-lg overflow-hidden">
                {/* Linha Principal */}
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      {expandedRows.has(tecnico.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {tecnico.colaborador?.razao_social?.slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {tecnico.colaborador?.razao_social || tecnico.colaborador?.nome_fantasia || 'Técnico'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Integração válida até: {format(new Date(tecnico.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    <StatusBadge status={tecnico.statusBlindagem} />

                    {/* Indicador de último envio */}
                    {(() => {
                      const ultimoEnvio = getUltimoEnvio(tecnico.colaborador_id);
                      if (ultimoEnvio) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  <Clock className="h-3 w-3" />
                                  Enviado
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Enviado em {format(new Date(ultimoEnvio.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                  {ultimoEnvio.enviado_por_nome && ` por ${ultimoEnvio.enviado_por_nome}`}
                                  <br />Para: {ultimoEnvio.destinatario_email}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                      return null;
                    })()}

                    {/* Botões de ação */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalEnvio(tecnico)}
                        title="Enviar documentos para portaria"
                        disabled={['BLOQUEADO_DOC', 'BLOQUEADO_INT', 'BLOQUEADO_MANUAL'].includes(tecnico.statusBlindagem)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBaixarKit(tecnico)}
                        title="Baixar KIT (Integração + ASO + NRs)"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        KIT
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Conteúdo Expandido - Detalhes dos Requisitos */}
                <CollapsibleContent>
                  <div className="border-t bg-muted/30 p-4 space-y-4">
                    {/* Motivo do status */}
                    <Alert className={
                      tecnico.statusBlindagem === 'LIBERADO' ? 'border-emerald-500/50 bg-emerald-500/10' :
                      tecnico.statusBlindagem === 'ATENCAO' ? 'border-amber-500/50 bg-amber-500/10' :
                      'border-destructive/50 bg-destructive/10'
                    }>
                      <AlertCircle className={`h-4 w-4 ${
                        tecnico.statusBlindagem === 'LIBERADO' ? 'text-emerald-600' :
                        tecnico.statusBlindagem === 'ATENCAO' ? 'text-amber-600' : 
                        'text-destructive'
                      }`} />
                      <AlertDescription className={
                        tecnico.statusBlindagem === 'LIBERADO' ? 'text-emerald-600' :
                        tecnico.statusBlindagem === 'ATENCAO' ? 'text-amber-600' : 
                        'text-destructive'
                      }>
                        <strong>Diagnóstico:</strong> {tecnico.motivoBlindagem}
                      </AlertDescription>
                    </Alert>

                    {/* Grid de documentos */}
                    <div className="grid gap-3">
                      {/* Integração Local */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">📄 Integração Local</p>
                            <p className="text-sm text-muted-foreground">
                              Vence: {format(new Date(tecnico.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {tecnico.comprovante_url ? (
                            <Button variant="outline" size="sm" onClick={() => window.open(tecnico.comprovante_url!, '_blank')}>
                              <Paperclip className="h-4 w-4 mr-1" />
                              Ver Anexo
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Sem anexo</span>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            ref={(el) => { fileInputRefs.current[tecnico.id] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadComprovante(tecnico.id, file);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRefs.current[tecnico.id]?.click()}
                            disabled={uploading}
                            title="Enviar/Atualizar comprovante"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Documentos Globais (ASO, NR10, NR35) */}
                      {tecnico.docsGlobais.map((doc) => (
                        <div key={doc.tipo} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                          <div className="flex items-center gap-3">
                            <Shield className={`h-5 w-5 ${
                              doc.status.color === 'green' ? 'text-emerald-600' :
                              doc.status.color === 'yellow' ? 'text-amber-600' :
                              doc.status.color === 'red' ? 'text-destructive' :
                              'text-muted-foreground'
                            }`} />
                            <div>
                              <p className="font-medium">📄 {doc.tipo} <span className="text-xs text-muted-foreground">(Global)</span></p>
                              <p className="text-sm text-muted-foreground">
                                {doc.dataVencimento
                                  ? `Vence: ${format(new Date(doc.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}`
                                  : 'Não cadastrado no RH'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={
                              doc.status.color === 'green' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                              doc.status.color === 'yellow' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              doc.status.color === 'red' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              'bg-muted text-muted-foreground'
                            }>
                              {doc.status.label}
                            </Badge>
                            {doc.arquivoUrl && (
                              <Button variant="outline" size="sm" onClick={() => window.open(doc.arquivoUrl!, '_blank')}>
                                <Paperclip className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Observações */}
                    {tecnico.observacoes && (
                      <div className="text-sm text-muted-foreground p-2 bg-muted/50 rounded">
                        <strong>Obs:</strong> {tecnico.observacoes}
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(tecnico)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      
                      {tecnico.is_blocked ? (
                        <Button variant="outline" size="sm" onClick={() => reativarAcesso.mutateAsync(tecnico.id)}>
                          <RefreshCcw className="h-4 w-4 mr-1" />
                          Reativar
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => revogarAcesso.mutateAsync({ id: tecnico.id, motivo: 'Acesso revogado pelo gestor' })}>
                          <Ban className="h-4 w-4 mr-1" />
                          Revogar
                        </Button>
                      )}

                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(tecnico.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Dialog de adicionar/editar técnico */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTecnico ? 'Editar Integração' : 'Vincular Técnico'}</DialogTitle>
            <DialogDescription>
              {editingTecnico ? 'Atualize os dados da integração.' : 'Adicione um técnico com permissão de acesso a esta unidade.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Seleção de técnico */}
            <div className="space-y-2">
              <Label>Técnico *</Label>
              <Select value={selectedColaborador} onValueChange={setSelectedColaborador} disabled={!!editingTecnico}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {(editingTecnico
                    ? allColaboradores.filter(c => c.id === editingTecnico.colaborador_id)
                    : colaboradoresDisponiveis
                  ).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razao_social || c.nome_fantasia || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Verificação automática de documentos */}
            {selectedColaborador && !editingTecnico && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Verificação Automática de Documentos
                </p>
                {docsSummary.map((doc) => (
                  <div key={doc.tipo} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {doc.existe ? (
                        <CheckCircle className={`h-4 w-4 ${
                          doc.status.color === 'green' ? 'text-emerald-600' :
                          doc.status.color === 'yellow' ? 'text-amber-600' :
                          'text-destructive'
                        }`} />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {doc.tipo}
                    </span>
                    <span className={
                      !doc.existe ? 'text-muted-foreground' :
                      doc.status.color === 'green' ? 'text-emerald-600' :
                      doc.status.color === 'yellow' ? 'text-amber-600' :
                      'text-destructive'
                    }>
                      {doc.existe && doc.validade
                        ? `Válido até ${format(new Date(doc.validade), "dd/MM/yyyy")}`
                        : 'Não cadastrado'}
                    </span>
                  </div>
                ))}
                {docsSummary.some(d => !d.existe || d.status.color === 'red') && (
                  <Alert className="mt-2 border-amber-500/50 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-600 text-xs">
                      Atenção: Alguns documentos estão faltando ou vencidos. O técnico poderá ser bloqueado.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Data de validade */}
            <div className="space-y-2">
              <Label>Validade da Integração *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} className="pl-10" />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddOrEdit} disabled={!selectedColaborador || !dataValidade || addTecnico.isPending || updateTecnico.isPending}>
              {(addTecnico.isPending || updateTecnico.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTecnico ? 'Salvar Alterações' : 'Vincular Técnico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o vínculo deste técnico com esta unidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Envio de Documentos */}
      <Dialog open={envioDialogOpen} onOpenChange={setEnvioDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Kit de Acesso
            </DialogTitle>
            <DialogDescription>
              Envie os documentos do técnico {tecnicoParaEnvio?.colaborador?.razao_social} para a portaria do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Destinatário */}
            <div className="space-y-2">
              <Label>E-mail do Destinatário *</Label>
              <Input
                type="email"
                placeholder="portaria@cliente.com"
                value={emailDestinatario}
                onChange={(e) => setEmailDestinatario(e.target.value)}
              />
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                value={assuntoEmail}
                onChange={(e) => setAssuntoEmail(e.target.value)}
              />
            </div>

            {/* Documentos a enviar */}
            <div className="space-y-2">
              <Label>Documentos a Enviar</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                {docsParaEnvio.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Checkbox
                      id={`doc-${idx}`}
                      checked={doc.selecionado}
                      onCheckedChange={() => toggleDocEnvio(idx)}
                    />
                    <label htmlFor={`doc-${idx}`} className="flex items-center gap-2 cursor-pointer flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{doc.tipo}</span>
                      <span className="text-sm text-muted-foreground">({doc.nome})</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => window.open(doc.url, '_blank')}
                      title="Visualizar documento"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-600 text-sm">
                O seu cliente de e-mail será aberto com os links dos documentos. 
                Complete o envio no seu aplicativo de e-mail.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnvioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviarEmail} 
              disabled={enviando || !emailDestinatario.trim() || docsParaEnvio.filter(d => d.selecionado).length === 0}
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
