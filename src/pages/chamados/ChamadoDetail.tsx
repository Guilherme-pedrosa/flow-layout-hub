import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChamados, Chamado, ChamadoEvolucao, STATUS_CONFIG, ChamadoStatus } from "@/hooks/useChamados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChamadoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getChamadoById, 
    getEvolucoes, 
    addEvolucao, 
    updateChamado, 
    deleteChamado 
  } = useChamados();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [evolucoes, setEvolucoes] = useState<ChamadoEvolucao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [novaEvolucao, setNovaEvolucao] = useState("");
  const [novoStatus, setNovoStatus] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    numeroTarefa: "",
    dataAtendimento: "",
    dataFechamento: "",
    observacao: "",
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    
    const [chamadoData, evolucoesData] = await Promise.all([
      getChamadoById(id),
      getEvolucoes(id),
    ]);
    
    setChamado(chamadoData);
    setEvolucoes(evolucoesData);
    
    if (chamadoData) {
      setEditData({
        numeroTarefa: chamadoData.numero_tarefa || "",
        dataAtendimento: chamadoData.data_atendimento
          ? new Date(chamadoData.data_atendimento).toISOString().split('T')[0]
          : "",
        dataFechamento: chamadoData.data_fechamento
          ? new Date(chamadoData.data_fechamento).toISOString().split('T')[0]
          : "",
        observacao: chamadoData.observacao || "",
      });
    }
    
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!id || !chamado) return;
    if (confirm(`Tem certeza que deseja excluir o chamado ${chamado.os_numero}?`)) {
      await deleteChamado.mutateAsync(id);
      toast.success("Chamado excluído com sucesso!");
      navigate("/chamados");
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    await updateChamado.mutateAsync({
      id,
      numero_tarefa: editData.numeroTarefa || null,
      data_atendimento: editData.dataAtendimento || null,
      data_fechamento: editData.dataFechamento || null,
      observacao: editData.observacao || null,
    });
    
    setIsEditing(false);
    loadData();
  };

  const handleAddEvolucao = async () => {
    if (!novaEvolucao.trim()) {
      toast.error("Por favor, descreva a evolução");
      return;
    }

    if (!id || !chamado) return;

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

  const calcularDias = (dataOS: Date | string | null | undefined) => {
    if (!dataOS) return 0;
    const data = new Date(dataOS);
    const hoje = new Date();
    const diff = hoje.getTime() - data.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as ChamadoStatus];
    if (!config) {
      return <Badge>{status}</Badge>;
    }
    return (
      <Badge 
        style={{ backgroundColor: config.color, color: 'white' }}
      >
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!chamado) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chamado não encontrado</p>
        <Button onClick={() => navigate("/chamados")} className="mt-4">
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
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
                  value={editData.numeroTarefa}
                  onChange={(e) => setEditData({ ...editData, numeroTarefa: e.target.value })}
                  placeholder="Digite o número da tarefa"
                />
              ) : (
                <p className="font-medium">{chamado.numero_tarefa || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Data OS</Label>
              <p className="font-medium">
                {chamado.os_data ? new Date(chamado.os_data).toLocaleDateString('pt-BR') : "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Data do Atendimento</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.dataAtendimento}
                  onChange={(e) => setEditData({ ...editData, dataAtendimento: e.target.value })}
                />
              ) : (
                <p className="font-medium">
                  {chamado.data_atendimento ? new Date(chamado.data_atendimento).toLocaleDateString('pt-BR') : "-"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Data do Fechamento</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.dataFechamento}
                  onChange={(e) => setEditData({ ...editData, dataFechamento: e.target.value })}
                />
              ) : (
                <p className="font-medium">
                  {chamado.data_fechamento ? new Date(chamado.data_fechamento).toLocaleDateString('pt-BR') : "-"}
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
                  onClick={handleSave}
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
            disabled={addEvolucao.isPending}
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
            {evolucoes?.length || 0} evolução(ões) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!evolucoes || evolucoes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma evolução registrada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {evolucoes.map((evolucao) => (
                <div key={evolucao.id} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(evolucao.created_at).toLocaleString('pt-BR')}
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
