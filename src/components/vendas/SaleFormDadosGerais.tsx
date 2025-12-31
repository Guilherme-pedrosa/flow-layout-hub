import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCpfCnpj } from "@/lib/formatters";
import { FileEdit, Search, Plus } from "lucide-react";
import { useSaleStatuses } from "@/hooks/useSales";
import { useCostCenters, CostCenter } from "@/hooks/useFinanceiro";
import { useSystemUsers } from "@/hooks/useServices";
import { usePessoas } from "@/hooks/usePessoas";
import { CadastrarPessoaDialog } from "@/components/shared/CadastrarPessoaDialog";

interface SaleFormDadosGeraisProps {
  formData: {
    sale_number?: number;
    client_id: string;
    seller_id: string;
    technician_id: string;
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
  const { data: users } = useSystemUsers();
  const { activeClientes, refetch: refetchPessoas } = usePessoas();

  const [showCadastrarCliente, setShowCadastrarCliente] = useState(false);

  // Converter pessoas para formato esperado
  const clientes = activeClientes.map(p => ({
    id: p.id,
    razao_social: p.razao_social,
    nome_fantasia: p.nome_fantasia,
    cpf_cnpj: p.cpf_cnpj,
  }));

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const activeStatuses = statuses?.filter(s => s.is_active) ?? [];
  const activeCostCenters = costCenters?.filter(c => c.is_active) ?? [];
  const activeUsers = users ?? [];



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
              <Input value={formData.sale_number ?? 'Novo'} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={clientes.map(c => ({
                  value: c.id,
                  label: c.razao_social || c.nome_fantasia || "Sem nome",
                  sublabel: c.cpf_cnpj ? formatCpfCnpj(c.cpf_cnpj, c.cpf_cnpj.length > 11 ? "PJ" : "PF") : undefined
                }))}
                value={formData.client_id}
                onChange={(v) => onChange('client_id', v)}
                placeholder="Selecione o cliente"
                searchPlaceholder="Buscar por nome ou CNPJ..."
                emptyMessage="Nenhum cliente encontrado"
                onCreateNew={() => setShowCadastrarCliente(true)}
                createNewLabel="Cadastrar novo cliente"
              />
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

    <CadastrarPessoaDialog
      open={showCadastrarCliente}
      onOpenChange={setShowCadastrarCliente}
      onSuccess={refetchPessoas}
      tipo="cliente"
      title="Cadastrar Novo Cliente"
    />
    </>
  );
}
