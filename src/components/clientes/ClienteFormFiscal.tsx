import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ClienteFormFiscalProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClienteFormFiscal({ formData, setFormData }: ClienteFormFiscalProps) {
  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Configurações Fiscais</h3>
        <p className="text-sm text-muted-foreground">
          Informações fiscais para emissão de notas (preparação futura)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="regime_tributario">Regime Tributário</Label>
          <Select
            value={formData.regime_tributario || ''}
            onValueChange={(value) => handleChange('regime_tributario', value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
              <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
              <SelectItem value="lucro_real">Lucro Real</SelectItem>
              <SelectItem value="mei">MEI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="contribuinte_icms">Contribuinte ICMS</Label>
            <p className="text-sm text-muted-foreground">
              O cliente é contribuinte do ICMS?
            </p>
          </div>
          <Switch
            id="contribuinte_icms"
            checked={formData.contribuinte_icms || false}
            onCheckedChange={(checked) => handleChange('contribuinte_icms', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="retencao_impostos">Retenção de Impostos</Label>
            <p className="text-sm text-muted-foreground">
              Aplicar retenção de impostos nas notas?
            </p>
          </div>
          <Switch
            id="retencao_impostos"
            checked={formData.retencao_impostos || false}
            onCheckedChange={(checked) => handleChange('retencao_impostos', checked)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes_fiscais">Observações Fiscais</Label>
        <Textarea
          id="observacoes_fiscais"
          value={formData.observacoes_fiscais || ''}
          onChange={(e) => handleChange('observacoes_fiscais', e.target.value)}
          placeholder="Informações fiscais relevantes..."
          rows={4}
        />
      </div>
    </div>
  );
}
