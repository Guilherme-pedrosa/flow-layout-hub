import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChamados, Chamado, ChamadoEvolucao, STATUS_CONFIG, ChamadoStatus } from "@/hooks/useChamados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChamadoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getChamadoById, 
    getEvolucoes, 
    addEvolucao, 
    updateChamado, 
    deleteChamado,
    calcularDias 
  } = useChamados();
  
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [evolucoes, setEvolucoes] = useState<ChamadoEvolucao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [novaEvolucao, setNovaEvolucao] = useState("");
  const [novoStatus, setNovoStatus] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    numero_tarefa: "",
    data_atendimento: "",
    data_fechamento: "",
    observacao: "",
  });
  
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    
    const [chamadoData, evolucoesData] = await Promise.all([
      getChamadoById(id),
      getEvolucoes(id),
    ]);
    
    setChamado(chamadoData);
    setEvolucoes(evolucoesData);
    
    if (chamadoData) {
      setEditData({
        numero_tarefa: chamadoData.numero_tarefa || "",
        data_atendimento: chamadoData.data_atendimento || "",
        data_fechamento: chamadoData.data_fechamento || "",
        observacao: chamadoData.observacao || "",
      });
    }
    
    setLoading(false);
  };
  
  const handleAddEvolucao = async () => {
    if (!novaEvolucao.trim() || !id || !chamado) return;
    
    await addEvolucao.mutateAsync({
      chamadoId: id,
      descricao: novaEvolucao,
      statusAnterior: chamado.status,
      statusNovo: novoStatus || chamado.status,
    });
    
    setNovaEvolucao("");
    setNovoStatus("");
    loadData();
  };
  
  const handleSaveEdit = async () => {
    if (!id) return;
    
    await updateChamado.mutateAsync({
      id,
      numero_tarefa: editData.numero_tarefa || null,
      data_atendimento: editData.data_atendimento || null,
      data_fechamento: editData.data_fechamento || null,
      observacao: editData.observacao || null,
    });
    
    setIsEditing(false);
    loadData();
  };
  
  const handleDelete = async () => {
    if (!id || !chamado) return;
    
    if (confirm(`Tem certeza que deseja excluir o chamado ${chamado.os_numero}?`)) {
      await deleteChamado.mutateAsync(id);
      navigate("/chamados");
    }
  };
  
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as ChamadoStatus] || { label: status, className: '' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!chamado) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/chamados')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="text-center py-8 text-muted-foreground">
          Chamado não encontrado
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chamados")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chamado #{chamado.os_numero}</h1>
            <p className="text-muted-foreground">
              Aberto há {calcularDias(chamado.os_data)} dias
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteChamado.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteChamado.isPending ? "Excluindo..." : "Excluir"}
        </Button>
      </div>

      {/* Informações do Chamado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações do Chamado</CardTitle>
            {getStatusBadge(chamado.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Número OS</Label>
              <p className="font-medium">{chamado.os_numero}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Número da Tarefa</Label>
              {isEditing ? (
                <Input
                  value={editData.numero_tarefa}
                  onChange={(e) => setEditData({ ...editData, numero_tarefa: e.target.value })}
                  placeholder="Digite o número da tarefa"
                />
              ) : (
                <p className="font-medium">{chamado.numero_tarefa || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Data OS</Label>
              <p className="font-medium">
                {chamado.os_data 
                  ? format(new Date(chamado.os_data), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'
                }
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Data do Atendimento</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.data_atendimento}
                  onChange={(e) => setEditData({ ...editData, data_atendimento: e.target.value })}
                />
              ) : (
                <p className="font-medium">
                  {chamado.data_atendimento 
                    ? format(new Date(chamado.data_atendimento), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'
                  }
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Data do Fechamento</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.data_fechamento}
                  onChange={(e) => setEditData({ ...editData, data_fechamento: e.target.value })}
                />
              ) : (
                <p className="font-medium">
                  {chamado.data_fechamento 
                    ? format(new Date(chamado.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'
                  }
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Distrito</Label>
              <p className="font-medium">{chamado.distrito || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Nome GT</Label>
              <p className="font-medium">{chamado.nome_gt || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Código Cliente</Label>
              <p className="font-medium">{chamado.cliente_codigo || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Nome TRA</Label>
              <p className="font-medium">{chamado.tra_nome || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-muted-foreground">Cliente</Label>
              <p className="font-medium">{chamado.cliente_nome || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-muted-foreground">Observação</Label>
              {isEditing ? (
                <Textarea
                  value={editData.observacao}
                  onChange={(e) => setEditData({ ...editData, observacao: e.target.value })}
                  placeholder="Digite observações sobre o chamado"
                  rows={3}
                />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{chamado.observacao || "-"}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateChamado.isPending}
                >
                  {updateChamado.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Editar Informações
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nova Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Evolução</CardTitle>
          <CardDescription>
            Registre uma nova atualização para este chamado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o que foi feito ou a situação atual..."
              value={novaEvolucao}
              onChange={(e) => setNovaEvolucao(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Atualizar Status (opcional)</Label>
            <Select value={novoStatus} onValueChange={setNovoStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Manter status atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando_agendamento">Aguardando agendamento</SelectItem>
                <SelectItem value="agendado">Agendado - ag atendimento</SelectItem>
                <SelectItem value="ag_retorno">Ag retorno</SelectItem>
                <SelectItem value="atendido_ag_fechamento">Atendido - Ag fechamento</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddEvolucao}
            disabled={addEvolucao.isPending || !novaEvolucao.trim()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Evolução
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Evoluções */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Evoluções</CardTitle>
          <CardDescription>
            {evolucoes.length} evolução(ões) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evolucoes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma evolução registrada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {evolucoes.map((evolucao) => (
                <div key={evolucao.id} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(evolucao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {evolucao.status_novo && evolucao.status_anterior !== evolucao.status_novo && (
                      <div className="flex items-center gap-2">
                        {getStatusBadge(evolucao.status_anterior || "")}
                        <span className="text-muted-foreground">→</span>
                        {getStatusBadge(evolucao.status_novo)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm">{evolucao.descricao}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
