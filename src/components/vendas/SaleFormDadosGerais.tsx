import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileEdit } from "lucide-react";
import { useSaleStatuses } from "@/hooks/useSales";
import { useCostCenters, CostCenter } from "@/hooks/useFinanceiro";
import { supabase } from "@/integrations/supabase/client";

interface SaleFormDadosGeraisProps {
  formData: {
    sale_number?: number;
    client_id: string;
    seller_name: string;
    status_id: string;
    sale_date: string;
    delivery_date: string;
    sales_channel: string;
    cost_center_id: string;
    quote_number: string;
    os_number: string;
    os_gc: string;
    extra_observation: string;
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

export function SaleFormDadosGerais({ formData, onChange }: SaleFormDadosGeraisProps) {
  const { statuses } = useSaleStatuses();
  const { costCenters, fetchCostCenters } = useCostCenters();
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    fetchCostCenters();
    supabase.from("clientes").select("id, razao_social, nome_fantasia").eq("status", "ativo")
      .then(({ data }) => setClientes(data ?? []));
  }, [fetchCostCenters]);

  const activeStatuses = statuses?.filter(s => s.is_active) ?? [];
  const activeCostCenters = costCenters?.filter(c => c.is_active) ?? [];

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
              <Input value={formData.sale_number ?? 'Novo'} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <Select value={formData.client_id} onValueChange={(v) => onChange('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social || c.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Input value={formData.seller_name} onChange={(e) => onChange('seller_name', e.target.value)} />
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
              <Input type="date" value={formData.sale_date} onChange={(e) => onChange('sale_date', e.target.value)} />
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
            <FileEdit className="h-5 w-5" />
            Campos extras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Número do orçamento</Label>
              <Input value={formData.quote_number} onChange={(e) => onChange('quote_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Número da OS</Label>
              <Input value={formData.os_number} onChange={(e) => onChange('os_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">OS GC</Label>
              <Input value={formData.os_gc} onChange={(e) => onChange('os_gc', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Observação</Label>
              <Input value={formData.extra_observation} onChange={(e) => onChange('extra_observation', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
