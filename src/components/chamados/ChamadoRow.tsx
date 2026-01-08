import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChamados, Chamado, STATUS_CONFIG, ChamadoStatus } from "@/hooks/useChamados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ChamadoRowProps {
  chamado: Chamado;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}

export function ChamadoRow({ chamado, onUpdate, onDelete }: ChamadoRowProps) {
  const navigate = useNavigate();
  const { updateChamado } = useChamados();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    numeroTarefa: chamado.numero_tarefa || "",
    dataAtendimento: chamado.data_atendimento
      ? new Date(chamado.data_atendimento).toISOString().split('T')[0]
      : "",
    dataFechamento: chamado.data_fechamento
      ? new Date(chamado.data_fechamento).toISOString().split('T')[0]
      : "",
    observacao: chamado.observacao || "",
    status: chamado.status,
  });

  const handleSave = async () => {
    await updateChamado.mutateAsync({
      id: chamado.id,
      numero_tarefa: editData.numeroTarefa || null,
      data_atendimento: editData.dataAtendimento || null,
      data_fechamento: editData.dataFechamento || null,
      observacao: editData.observacao || null,
      status: editData.status,
    });
    setDialogOpen(false);
    onUpdate();
  };

  const calcularDias = (dataOS: string | null | undefined) => {
    if (!dataOS) return 0;
    const hoje = new Date();
    const data = new Date(dataOS);
    const diff = hoje.getTime() - data.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as ChamadoStatus];
    if (!config) {
      return <Badge>{status}</Badge>;
    }
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{chamado.os_numero}</TableCell>
      <TableCell>{chamado.numero_tarefa || "-"}</TableCell>
      <TableCell>
        {chamado.os_data 
          ? new Date(chamado.os_data).toLocaleDateString('pt-BR')
          : "-"
        }
      </TableCell>
      <TableCell>
        {chamado.data_atendimento
          ? new Date(chamado.data_atendimento).toLocaleDateString('pt-BR')
          : "-"}
      </TableCell>
      <TableCell>
        {chamado.data_fechamento
          ? new Date(chamado.data_fechamento).toLocaleDateString('pt-BR')
          : "-"}
      </TableCell>
      <TableCell>{calcularDias(chamado.os_data)}</TableCell>
      <TableCell>{chamado.distrito || "-"}</TableCell>
      <TableCell>{chamado.nome_gt || "-"}</TableCell>
      <TableCell className="max-w-[200px] truncate">{chamado.cliente_nome || "-"}</TableCell>
      <TableCell className="max-w-xs truncate">{chamado.observacao || "-"}</TableCell>
      <TableCell>{getStatusBadge(chamado.status)}</TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditData({
                    numeroTarefa: chamado.numero_tarefa || "",
                    dataAtendimento: chamado.data_atendimento
                      ? new Date(chamado.data_atendimento).toISOString().split('T')[0]
                      : "",
                    dataFechamento: chamado.data_fechamento
                      ? new Date(chamado.data_fechamento).toISOString().split('T')[0]
                      : "",
                    observacao: chamado.observacao || "",
                    status: chamado.status,
                  });
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Chamado #{chamado.os_numero}</DialogTitle>
                <DialogDescription>
                  Atualize as informações do chamado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroTarefa">Número da Tarefa</Label>
                  <Input
                    id="numeroTarefa"
                    value={editData.numeroTarefa}
                    onChange={(e) => setEditData({ ...editData, numeroTarefa: e.target.value })}
                    placeholder="Número da tarefa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataAtendimento">Data do Atendimento</Label>
                  <Input
                    id="dataAtendimento"
                    type="date"
                    value={editData.dataAtendimento}
                    onChange={(e) => setEditData({ ...editData, dataAtendimento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFechamento">Data do Fechamento</Label>
                  <Input
                    id="dataFechamento"
                    type="date"
                    value={editData.dataFechamento}
                    onChange={(e) => setEditData({ ...editData, dataFechamento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) => setEditData({ ...editData, status: value as ChamadoStatus })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
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
                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    value={editData.observacao}
                    onChange={(e) => setEditData({ ...editData, observacao: e.target.value })}
                    placeholder="Observações sobre o chamado"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={updateChamado.isPending}
                  className="w-full"
                >
                  {updateChamado.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/chamados/${chamado.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(`Excluir chamado ${chamado.os_numero}?`)) {
                onDelete(chamado.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
