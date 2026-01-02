import { useState, useEffect } from "react";
import { useAllEquipments, useEquipments } from "@/hooks/useEquipments";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Package, Cloud, Loader2 } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";

export default function Equipamentos() {
  const { currentCompany } = useCompany();
  const { equipments, isLoading, refetch } = useAllEquipments();
  const { createEquipment, updateEquipment, deleteEquipment } = useEquipments();
  const { fetchClientes } = useClientes();
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [formData, setFormData] = useState({
    serial_number: "",
    brand: "",
    model: "",
    equipment_type: "",
    client_id: "",
    sector: "",
    location_description: "",
    notes: "",
  });

  // Carregar clientes
  useEffect(() => {
    const loadClientes = async () => {
      const data = await fetchClientes();
      setClientes(data);
    };
    loadClientes();
  }, [currentCompany]);

  const filteredEquipments = equipments.filter((eq: any) => {
    const searchLower = search.toLowerCase();
    return (
      eq.serial_number?.toLowerCase().includes(searchLower) ||
      eq.brand?.toLowerCase().includes(searchLower) ||
      eq.model?.toLowerCase().includes(searchLower) ||
      eq.equipment_type?.toLowerCase().includes(searchLower) ||
      eq.client?.razao_social?.toLowerCase().includes(searchLower)
    );
  });

  const handleSync = async () => {
    if (!currentCompany) {
      toast.error('Selecione uma empresa primeiro');
      return;
    }
    console.log('[handleSync] company_id:', currentCompany.id);
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('field-sync-equipment', {
        body: { company_id: currentCompany.id }
      });
      
      if (error) {
        // Parse error message from edge function
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('API Key do Field Control não configurada')) {
          toast.error('Configure a API Key do Field Control nas configurações da empresa para sincronizar equipamentos.');
          return;
        }
        throw error;
      }
      
      if (data?.success === false) {
        toast.error(data.error || 'Erro ao sincronizar');
        return;
      }
      
      toast.success(`Sync concluído: ${data.created || 0} novos, ${data.updated || 0} atualizados`);
      refetch();
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      if (errorMsg.includes('API Key do Field Control não configurada')) {
        toast.error('Configure a API Key do Field Control nas configurações da empresa.');
      } else {
        toast.error(`Erro ao sincronizar: ${errorMsg}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenNew = () => {
    setEditingEquipment(null);
    setFormData({
      serial_number: "",
      brand: "",
      model: "",
      equipment_type: "",
      client_id: "",
      sector: "",
      location_description: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (eq: any) => {
    setEditingEquipment(eq);
    setFormData({
      serial_number: eq.serial_number || "",
      brand: eq.brand || "",
      model: eq.model || "",
      equipment_type: eq.equipment_type || "",
      client_id: eq.client_id || "",
      sector: eq.sector || "",
      location_description: eq.location_description || "",
      notes: eq.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentCompany || !formData.serial_number) {
      toast.error("Número de série é obrigatório");
      return;
    }

    try {
      if (editingEquipment) {
        await updateEquipment.mutateAsync({
          id: editingEquipment.id,
          data: {
            ...formData,
            client_id: formData.client_id || null,
          }
        });
        
        // Se tiver field_equipment_id, atualiza no Field Control também
        if (editingEquipment.field_equipment_id) {
          await syncEquipmentToField(editingEquipment.id);
        }
      } else {
        const result = await createEquipment.mutateAsync({
          ...formData,
          company_id: currentCompany.id,
          client_id: formData.client_id || null,
          is_active: true,
        });
        
        // Enviar para Field Control
        await syncEquipmentToField(result.id);
      }
      
      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
    }
  };

  const syncEquipmentToField = async (equipmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('field-create-equipment', {
        body: { 
          company_id: currentCompany?.id,
          equipment_id: equipmentId
        }
      });
      
      if (error) {
        // Silently ignore if API key not configured - equipment saved locally
        const errorMsg = error.message || String(error);
        if (!errorMsg.includes('API Key')) {
          console.error("Erro ao enviar para Field Control:", error);
        }
        return;
      }
      
      if (data?.success && data?.field_equipment_id) {
        toast.success("Equipamento sincronizado com Field Control");
      }
    } catch (err) {
      // Silent fail - equipment still saved locally
      console.error("Erro ao sincronizar com Field:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja remover este equipamento?")) {
      await deleteEquipment.mutateAsync(id);
      refetch();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Equipamentos"
        description="Gerencie os equipamentos sincronizados do Field Control"
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por série, marca, modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            Sincronizar Field
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Equipamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            {filteredEquipments.length} equipamento(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum equipamento encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Série</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipments.map((eq: any) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.serial_number}</TableCell>
                      <TableCell>{eq.brand || "-"}</TableCell>
                      <TableCell>{eq.model || "-"}</TableCell>
                      <TableCell>{eq.equipment_type || "-"}</TableCell>
                      <TableCell>
                        {eq.client?.razao_social || eq.client?.nome_fantasia || "-"}
                      </TableCell>
                      <TableCell>{eq.sector || "-"}</TableCell>
                      <TableCell>{eq.location_description || "-"}</TableCell>
                      <TableCell>
                        {eq.field_equipment_id ? (
                          <Badge variant="secondary" className="gap-1">
                            <Cloud className="h-3 w-3" /> Field
                          </Badge>
                        ) : (
                          <Badge variant="outline">WAI</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(eq)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(eq.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? "Editar Equipamento" : "Novo Equipamento"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="serial_number">Número de Série *</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="equipment_type">Tipo</Label>
                <Input
                  id="equipment_type"
                  value={formData.equipment_type}
                  onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sector">Setor</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem cliente</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razao_social || c.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location_description">Localização</Label>
              <Input
                id="location_description"
                value={formData.location_description}
                onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createEquipment.isPending || updateEquipment.isPending}>
              {(createEquipment.isPending || updateEquipment.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
