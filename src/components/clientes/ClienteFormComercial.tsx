import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClienteFormComercialProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClienteFormComercial({ formData, setFormData }: ClienteFormComercialProps) {
  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Configurações Comerciais</h3>
        <p className="text-sm text-muted-foreground">
          Defina as condições comerciais padrão para este cliente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo_cliente">Tipo de Cliente</Label>
          <Select
            value={formData.tipo_cliente || 'avulso'}
            onValueChange={(value) => handleChange('tipo_cliente', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="avulso">Avulso</SelectItem>
              <SelectItem value="contrato">Contrato</SelectItem>
              <SelectItem value="grande_conta">Grande Conta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="condicao_pagamento">Condição de Pagamento</Label>
          <Input
            id="condicao_pagamento"
            value={formData.condicao_pagamento || ''}
            onChange={(e) => handleChange('condicao_pagamento', e.target.value)}
            placeholder="Ex: 30/60/90 dias"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="limite_credito">Limite de Crédito (R$)</Label>
          <Input
            id="limite_credito"
            type="number"
            min="0"
            step="0.01"
            value={formData.limite_credito || ''}
            onChange={(e) => handleChange('limite_credito', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes_comerciais">Observações Comerciais</Label>
        <Textarea
          id="observacoes_comerciais"
          value={formData.observacoes_comerciais || ''}
          onChange={(e) => handleChange('observacoes_comerciais', e.target.value)}
          placeholder="Informações comerciais relevantes sobre o cliente..."
          rows={4}
        />
      </div>
    </div>
  );
}
