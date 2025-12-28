import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClienteFormOperacionalProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClienteFormOperacional({ formData, setFormData }: ClienteFormOperacionalProps) {
  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Configurações Operacionais</h3>
        <p className="text-sm text-muted-foreground">
          Informações internas para gestão operacional
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="responsavel_comercial">Responsável Comercial</Label>
          <Input
            id="responsavel_comercial"
            value={formData.responsavel_comercial || ''}
            onChange={(e) => handleChange('responsavel_comercial', e.target.value)}
            placeholder="Nome do responsável"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsavel_tecnico">Responsável Técnico</Label>
          <Input
            id="responsavel_tecnico"
            value={formData.responsavel_tecnico || ''}
            onChange={(e) => handleChange('responsavel_tecnico', e.target.value)}
            placeholder="Nome do técnico"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sla_padrao">SLA Padrão</Label>
          <Input
            id="sla_padrao"
            value={formData.sla_padrao || ''}
            onChange={(e) => handleChange('sla_padrao', e.target.value)}
            placeholder="Ex: 4 horas, 24 horas"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes_internas">Observações Internas</Label>
        <Textarea
          id="observacoes_internas"
          value={formData.observacoes_internas || ''}
          onChange={(e) => handleChange('observacoes_internas', e.target.value)}
          placeholder="Informações internas sobre o cliente (não visíveis para o cliente)..."
          rows={4}
        />
      </div>
    </div>
  );
}
