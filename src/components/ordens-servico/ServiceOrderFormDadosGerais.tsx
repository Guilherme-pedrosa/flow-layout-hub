import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCpfCnpj } from "@/lib/formatters";
import { FileEdit, Wrench, Plus, Clock, Monitor, RefreshCw } from "lucide-react";
import { useServiceOrderStatuses } from "@/hooks/useServiceOrders";
import { useCostCenters } from "@/hooks/useFinanceiro";
import { useSystemUsers } from "@/hooks/useServices";
import { useClientes } from "@/hooks/useClientes";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useEquipments } from "@/hooks/useEquipments";
import { useFieldServiceTypes } from "@/hooks/useFieldServiceTypes";
import { CadastrarPessoaDialog } from "@/components/shared/CadastrarPessoaDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery } from "@tanstack/react-query";

interface ServiceOrderFormDadosGeraisProps {
  formData: {
    order_number?: number;
    client_id: string;
    seller_id: string;
    technician_id: string;
    status_id: string;
    order_date: string;
    delivery_date: string;
    scheduled_time: string;
    estimated_duration: string;
    sales_channel: string;
    cost_center_id: string;
    service_type_id: string;
    equipment_id: string;
    equipment_type: string;
    equipment_brand: string;
    equipment_model: string;
    equipment_serial: string;
    reported_issue: string;
  };
  onChange: (field: string, value: string) => void;
}

const salesChannelOptions = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'ecommerce', label: 'E-commerce' },
];

export function ServiceOrderFormDadosGerais({ formData, onChange }: ServiceOrderFormDadosGeraisProps) {
  const { currentCompany } = useCompany();
  const { statuses } = useServiceOrderStatuses();
  const { costCenters } = useCostCenters();
  const { data: users } = useSystemUsers();
  const { fetchClientes } = useClientes();
  const { activeServiceTypes, createServiceType, refetch: refetchServiceTypes } = useServiceTypes();
  const { equipments: clientEquipments, createEquipment, refetch: refetchEquipments } = useEquipments(formData.client_id || undefined);
  const { syncServiceTypes, isSyncing } = useFieldServiceTypes();

  // Buscar todos os clientes da empresa
  const { data: clientes = [], refetch: refetchClientes, isLoading: isLoadingClientes } = useQuery({
    queryKey: ['clientes-for-os', currentCompany?.id],
    queryFn: fetchClientes,
    enabled: !!currentCompany?.id,
  });

  // Debug log para verificar clientes carregados
  console.log('[ServiceOrderFormDadosGerais] Clientes carregados:', clientes.length, 'Company:', currentCompany?.id, 'Loading:', isLoadingClientes);

  const [showCadastrarCliente, setShowCadastrarCliente] = useState(false);
  const [showCadastrarEquipamento, setShowCadastrarEquipamento] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    serial_number: '',
    brand: '',
    model: '',
    equipment_type: '',
    location_description: ''
  });

  const activeStatuses = statuses?.filter(s => s.is_active) ?? [];
  const activeCostCenters = costCenters?.filter(c => c.is_active) ?? [];
  const activeUsers = users ?? [];

  // Quando seleciona um equipamento, preenche os campos de equipamento
  useEffect(() => {
    if (formData.equipment_id) {
      const selectedEquipment = clientEquipments.find(e => e.id === formData.equipment_id);
      if (selectedEquipment) {
        onChange('equipment_type', selectedEquipment.equipment_type || '');
        onChange('equipment_brand', selectedEquipment.brand || '');
        onChange('equipment_model', selectedEquipment.model || '');
        onChange('equipment_serial', selectedEquipment.serial_number || '');
      }
    }
  }, [formData.equipment_id, clientEquipments]);

  // Quando seleciona um tipo de serviço, atualiza a duração estimada
  useEffect(() => {
    if (formData.service_type_id) {
      const selectedType = activeServiceTypes.find(t => t.id === formData.service_type_id);
      if (selectedType && !formData.estimated_duration) {
        onChange('estimated_duration', selectedType.default_duration.toString());
      }
    }
  }, [formData.service_type_id, activeServiceTypes]);

  const handleSaveEquipment = async () => {
    if (!currentCompany || !formData.client_id || !newEquipment.serial_number) return;

    const result = await createEquipment.mutateAsync({
      company_id: currentCompany.id,
      client_id: formData.client_id,
      serial_number: newEquipment.serial_number,
      brand: newEquipment.brand,
      model: newEquipment.model,
      equipment_type: newEquipment.equipment_type,
      location_description: newEquipment.location_description,
      is_active: true
    });

    if (result) {
      onChange('equipment_id', result.id);
      setShowCadastrarEquipamento(false);
      setNewEquipment({ serial_number: '', brand: '', model: '', equipment_type: '', location_description: '' });
      refetchEquipments();
    }
  };

  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileEdit className="h-5 w-5" />
            Dados gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={formData.order_number ?? 'Novo'} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={clientes.map(c => ({
                  value: c.id,
                  label: c.razao_social || c.nome_fantasia || "Sem nome",
                  sublabel: c.cpf_cnpj ? formatCpfCnpj(c.cpf_cnpj, c.cpf_cnpj.replace(/\D/g, '').length > 11 ? "PJ" : "PF") : undefined
                }))}
                value={formData.client_id}
                onChange={(v) => {
                  onChange('client_id', v);
                  onChange('equipment_id', ''); // Limpa equipamento ao mudar cliente
                }}
                placeholder="Selecione o cliente"
                searchPlaceholder="Buscar por nome ou CNPJ..."
                emptyMessage="Nenhum cliente encontrado"
                onCreateNew={() => setShowCadastrarCliente(true)}
                createNewLabel="Cadastrar novo cliente"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de OS <span className="text-destructive">*</span></Label>
              <div className="flex gap-1">
                <Select value={formData.service_type_id} onValueChange={(v) => onChange('service_type_id', v)}>
                  <SelectTrigger className={`flex-1 ${!formData.service_type_id ? 'border-destructive/50' : ''}`}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                          {t.field_service_id && (
                            <span className="text-xs text-muted-foreground">(Field)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => syncServiceTypes()}
                  disabled={isSyncing}
                  title="Sincronizar tipos do Field Control"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {activeServiceTypes.length === 0 && (
                <p className="text-xs text-destructive">Nenhum tipo cadastrado. Clique no botão para sincronizar do Field.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Situação <span className="text-destructive">*</span></Label>
              <Select value={formData.status_id} onValueChange={(v) => onChange('status_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeStatuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={formData.seller_id} onValueChange={(v) => onChange('seller_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Técnico Responsável</Label>
              <Select value={formData.technician_id} onValueChange={(v) => onChange('technician_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.order_date} onChange={(e) => onChange('order_date', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Prazo de entrega / Agendamento</Label>
              <Input type="date" value={formData.delivery_date} onChange={(e) => onChange('delivery_date', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Horário agendado
              </Label>
              <Input 
                type="time" 
                value={formData.scheduled_time} 
                onChange={(e) => onChange('scheduled_time', e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Duração estimada (min)</Label>
              <Input 
                type="number" 
                value={formData.estimated_duration} 
                onChange={(e) => onChange('estimated_duration', e.target.value)} 
                placeholder="60"
              />
            </div>

            <div className="space-y-2">
              <Label>Canal de venda</Label>
              <Select value={formData.sales_channel} onValueChange={(v) => onChange('sales_channel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {salesChannelOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Centro de custo</Label>
              <Select value={formData.cost_center_id} onValueChange={(v) => onChange('cost_center_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeCostCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5" />
            Equipamento do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Seletor de equipamento cadastrado */}
            <div className="md:col-span-2 space-y-2">
              <Label>Selecionar equipamento cadastrado</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.equipment_id} 
                  onValueChange={(v) => onChange('equipment_id', v)}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={formData.client_id ? "Selecione ou cadastre novo" : "Selecione um cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientEquipments.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{e.serial_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {[e.brand, e.model, e.equipment_type].filter(Boolean).join(' - ')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  disabled={!formData.client_id}
                  onClick={() => setShowCadastrarEquipamento(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {!formData.client_id && (
                <p className="text-xs text-muted-foreground">Selecione um cliente para ver seus equipamentos</p>
              )}
              {formData.client_id && clientEquipments.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum equipamento cadastrado para este cliente</p>
              )}
            </div>

            <div className="md:col-span-2" />

            {/* Campos de equipamento (preenchidos automaticamente ou manual) */}
            <div className="space-y-2">
              <Label>Tipo de equipamento</Label>
              <Input value={formData.equipment_type} onChange={(e) => onChange('equipment_type', e.target.value)} placeholder="Ex: Notebook" />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={formData.equipment_brand} onChange={(e) => onChange('equipment_brand', e.target.value)} placeholder="Ex: Dell" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={formData.equipment_model} onChange={(e) => onChange('equipment_model', e.target.value)} placeholder="Ex: Inspiron 15" />
            </div>
            <div className="space-y-2">
              <Label>Número de série</Label>
              <Input value={formData.equipment_serial} onChange={(e) => onChange('equipment_serial', e.target.value)} placeholder="Ex: ABC123XYZ" />
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label>Defeito relatado</Label>
              <Textarea value={formData.reported_issue} onChange={(e) => onChange('reported_issue', e.target.value)} rows={2} placeholder="Descreva o problema relatado pelo cliente..." />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <CadastrarPessoaDialog
      open={showCadastrarCliente}
      onOpenChange={setShowCadastrarCliente}
      onSuccess={() => refetchClientes()}
      tipo="cliente"
      title="Cadastrar Novo Cliente"
    />

    {/* Dialog para cadastrar novo equipamento */}
    <Dialog open={showCadastrarEquipamento} onOpenChange={setShowCadastrarEquipamento}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Equipamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Número de Série <span className="text-destructive">*</span></Label>
            <Input 
              value={newEquipment.serial_number} 
              onChange={(e) => setNewEquipment(prev => ({ ...prev, serial_number: e.target.value }))} 
              placeholder="Ex: SN123456789"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input 
                value={newEquipment.brand} 
                onChange={(e) => setNewEquipment(prev => ({ ...prev, brand: e.target.value }))} 
                placeholder="Ex: Dell"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input 
                value={newEquipment.model} 
                onChange={(e) => setNewEquipment(prev => ({ ...prev, model: e.target.value }))} 
                placeholder="Ex: Inspiron 15"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Equipamento</Label>
            <Input 
              value={newEquipment.equipment_type} 
              onChange={(e) => setNewEquipment(prev => ({ ...prev, equipment_type: e.target.value }))} 
              placeholder="Ex: Notebook, Impressora, Ar Condicionado"
            />
          </div>
          <div className="space-y-2">
            <Label>Localização / Setor</Label>
            <Input 
              value={newEquipment.location_description} 
              onChange={(e) => setNewEquipment(prev => ({ ...prev, location_description: e.target.value }))} 
              placeholder="Ex: Sala de reuniões, 2º andar"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCadastrarEquipamento(false)}>Cancelar</Button>
          <Button 
            onClick={handleSaveEquipment} 
            disabled={!newEquipment.serial_number || createEquipment.isPending}
          >
            {createEquipment.isPending ? 'Salvando...' : 'Salvar Equipamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
