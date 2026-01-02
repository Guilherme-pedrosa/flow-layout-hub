import { useState, useEffect } from "react";
import { useAllEquipments, useEquipments } from "@/hooks/useEquipments";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Package, Cloud, Loader2, Calendar } from "lucide-react";
import { EquipmentForm } from "@/components/equipamentos";
import { format } from "date-fns";

export default function Equipamentos() {
  const { currentCompany } = useCompany();
  const { equipments, isLoading, refetch } = useAllEquipments();
  const { createEquipment, updateEquipment, deleteEquipment } = useEquipments();
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Carregar apenas clientes que têm amarração com Field Control
  useEffect(() => {
    const loadClientes = async () => {
      if (!currentCompany) return;
      
      // Buscar clientes sincronizados com Field Control
      const { data: syncData } = await supabase
        .from("field_control_sync")
        .select("wai_id")
        .eq("company_id", currentCompany.id)
        .eq("entity_type", "customer");
      
      if (syncData && syncData.length > 0) {
        const clientIds = syncData.map(s => s.wai_id);
        
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("id, razao_social, nome_fantasia, cpf_cnpj")
          .in("id", clientIds)
          .eq("status", "ativo")
          .order("razao_social");
        
        setClientes(clientesData || []);
      } else {
        setClientes([]);
      }
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
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('field-sync-equipment', {
        body: { company_id: currentCompany.id }
      });
      
      if (error) {
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
    setDialogOpen(true);
  };

  const handleOpenEdit = (eq: any) => {
    setEditingEquipment(eq);
    setDialogOpen(true);
  };

  const handleSave = async (formData: any) => {
    if (!currentCompany) {
      toast.error("Selecione uma empresa");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        client_id: formData.client_id || null,
      };

      if (editingEquipment) {
        await updateEquipment.mutateAsync({
          id: editingEquipment.id,
          data: dataToSave
        });
        
        // Se tiver field_equipment_id, atualiza no Field Control também
        if (editingEquipment.field_equipment_id) {
          await syncEquipmentToField(editingEquipment.id);
        }
      } else {
        const result = await createEquipment.mutateAsync({
          ...dataToSave,
          company_id: currentCompany.id,
          is_active: true,
        });
        
        // Enviar para Field Control
        await syncEquipmentToField(result.id);
      }
      
      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
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
      console.error("Erro ao sincronizar com Field:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja remover este equipamento?")) {
      await deleteEquipment.mutateAsync(id);
      refetch();
    }
  };

  const isWarrantyValid = (warrantyEnd: string | null) => {
    if (!warrantyEnd) return null;
    return new Date(warrantyEnd) > new Date();
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Equipamentos"
        description="Cadastre e gerencie equipamentos. Os equipamentos serão sincronizados com o Field Control."
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
                    <TableHead>Localização</TableHead>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipments.map((eq: any) => {
                    const warrantyStatus = isWarrantyValid(eq.warranty_end);
                    
                    return (
                      <TableRow key={eq.id}>
                        <TableCell className="font-medium">{eq.serial_number}</TableCell>
                        <TableCell>{eq.brand || "-"}</TableCell>
                        <TableCell>{eq.model || "-"}</TableCell>
                        <TableCell>{eq.equipment_type || "-"}</TableCell>
                        <TableCell>
                          {eq.client?.razao_social || eq.client?.nome_fantasia || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {eq.sector && <span>{eq.sector}</span>}
                            {eq.sector && eq.environment && <span> / </span>}
                            {eq.environment && <span>{eq.environment}</span>}
                            {!eq.sector && !eq.environment && "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {eq.warranty_end ? (
                            <Badge 
                              variant={warrantyStatus ? "default" : "destructive"}
                              className="gap-1"
                            >
                              <Calendar className="h-3 w-3" />
                              {format(new Date(eq.warranty_end), "dd/MM/yyyy")}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de equipamento */}
      <EquipmentForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        equipment={editingEquipment}
        clientes={clientes}
        companyId={currentCompany?.id}
        onSave={handleSave}
        isSaving={saving}
      />
    </div>
  );
}
