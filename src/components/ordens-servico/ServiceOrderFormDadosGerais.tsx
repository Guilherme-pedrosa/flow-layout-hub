import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileEdit, Search, Wrench } from "lucide-react";
import { useServiceOrderStatuses } from "@/hooks/useServiceOrders";
import { useCostCenters } from "@/hooks/useFinanceiro";
import { useSystemUsers } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";

interface ServiceOrderFormDadosGeraisProps {
  formData: {
    order_number?: number;
    client_id: string;
    seller_id: string;
    technician_id: string;
    status_id: string;
    order_date: string;
    delivery_date: string;
    sales_channel: string;
    cost_center_id: string;
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
  const { statuses } = useServiceOrderStatuses();
  const { costCenters, fetchCostCenters } = useCostCenters();
  const { data: users } = useSystemUsers();
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");

  useEffect(() => {
    fetchCostCenters();
    supabase.from("clientes").select("id, razao_social, nome_fantasia, cpf_cnpj").eq("status", "ativo")
      .then(({ data }) => setClientes(data ?? []));
  }, [fetchCostCenters]);

  const activeStatuses = statuses?.filter(s => s.is_active) ?? [];
  const activeCostCenters = costCenters?.filter(c => c.is_active) ?? [];
  const activeUsers = users ?? [];

  const filteredClientes = clienteSearch
    ? clientes.filter(c => {
        const searchLower = clienteSearch.toLowerCase();
        const razao = (c.razao_social || '').toLowerCase();
        const fantasia = (c.nome_fantasia || '').toLowerCase();
        const cpfCnpj = (c.cpf_cnpj || '').replace(/\D/g, '');
        const searchClean = clienteSearch.replace(/\D/g, '');
        
        return razao.includes(searchLower) || 
               fantasia.includes(searchLower) || 
               cpfCnpj.includes(searchClean);
      })
    : clientes;

  return (
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
              <Select value={formData.client_id} onValueChange={(v) => onChange('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou CNPJ..."
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filteredClientes.length} cliente(s) encontrado(s)
                    </p>
                  </div>
                  {filteredClientes.slice(0, 30).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razao_social || c.nome_fantasia}
                      {c.cpf_cnpj && <span className="text-muted-foreground ml-1">({c.cpf_cnpj})</span>}
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
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.order_date} onChange={(e) => onChange('order_date', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Prazo de entrega</Label>
              <Input type="date" value={formData.delivery_date} onChange={(e) => onChange('delivery_date', e.target.value)} />
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
            <Wrench className="h-5 w-5" />
            Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
  );
}
