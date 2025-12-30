import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, X, Info, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NcmValidation {
  valid: boolean;
  ncmDescription?: string;
  suggestion?: string;
  confidence?: string;
  notes?: string;
  error?: string;
}

interface NcmSuggestion {
  ncm: string;
  description: string;
  confidence: 'alta' | 'média' | 'baixa';
  reason: string;
}

interface NcmSuggestionResult {
  suggestions: NcmSuggestion[];
  notes?: string;
  error?: string;
}

interface ProductFormFiscalProps {
  formData: {
    ncm: string;
    ncm_validated: boolean;
    ncm_description: string;
    cest: string;
    origin: string;
    net_weight: number;
    gross_weight: number;
    fci_number: string;
    specific_product: string;
    benefit_code: string;
    description: string;
    icms_rate: number;
    product_group?: string;
  };
  onChange: (field: string, value: any) => void;
}

const originOptions = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira (importação direta)' },
  { value: '2', label: '2 - Estrangeira (adquirida no mercado interno)' },
  { value: '3', label: '3 - Nacional (mais de 40% de conteúdo estrangeiro)' },
  { value: '4', label: '4 - Nacional (processos básicos)' },
  { value: '5', label: '5 - Nacional (menos de 40% de conteúdo estrangeiro)' },
  { value: '6', label: '6 - Estrangeira (importação direta, sem similar)' },
  { value: '7', label: '7 - Estrangeira (mercado interno, sem similar)' },
  { value: '8', label: '8 - Nacional (mais de 70% de conteúdo estrangeiro)' },
];

const specificProductOptions = [
  { value: 'nenhum', label: 'Não usar' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'arma', label: 'Arma de fogo' },
];

const confidenceColors = {
  alta: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  média: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  baixa: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <div className="flex items-center gap-1">
    <Label className="text-sm">{label}</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export function ProductFormFiscal({ formData, onChange }: ProductFormFiscalProps) {
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<NcmValidation | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<NcmSuggestionResult | null>(null);

  const suggestNCM = async () => {
    if (!formData.description) {
      toast.error('Informe a descrição do produto para sugerir NCM');
      return;
    }

    setSuggesting(true);
    setSuggestions(null);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-ncm', {
        body: { 
          productDescription: formData.description,
          productCategory: formData.product_group 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data);
      toast.success('Sugestões de NCM geradas!');
    } catch (error) {
      console.error('Error suggesting NCM:', error);
      toast.error('Erro ao sugerir NCM');
    } finally {
      setSuggesting(false);
    }
  };

  const applyNcmSuggestion = (suggestion: NcmSuggestion) => {
    onChange('ncm', suggestion.ncm);
    onChange('ncm_description', suggestion.description);
    onChange('ncm_validated', false);
    setSuggestions(null);
    toast.success(`NCM ${suggestion.ncm} aplicado!`);
  };

  const validateNCM = async () => {
    if (!formData.ncm) {
      toast.error('Informe o NCM para validar');
      return;
    }

    setValidating(true);
    setValidation(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-ncm', {
        body: { 
          ncm: formData.ncm,
          productDescription: formData.description 
        },
      });

      if (error) throw error;

      setValidation(data);
      
      if (data.valid) {
        onChange('ncm_validated', true);
        onChange('ncm_description', data.ncmDescription || '');
        toast.success('NCM validado com sucesso!');
      } else {
        onChange('ncm_validated', false);
        toast.error(data.error || 'NCM inválido');
      }
    } catch (error) {
      console.error('Error validating NCM:', error);
      toast.error('Erro ao validar NCM');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Estas informações aparecerão na hora de emitir a NF-e
        </AlertDescription>
      </Alert>

      {/* Campos fiscais principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            label="Cód. benefício" 
            tooltip="Código de benefício fiscal para redução de ICMS (ex: SC123456)" 
          />
          <Input
            value={formData.benefit_code}
            onChange={(e) => onChange('benefit_code', e.target.value)}
            placeholder="Código benefício fiscal"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">NCM</Label>
            {formData.ncm_validated && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Validado
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={formData.ncm}
              onChange={(e) => {
                onChange('ncm', e.target.value);
                onChange('ncm_validated', false);
              }}
              placeholder="00000000"
              className={formData.ncm_validated ? 'border-green-500' : ''}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={validateNCM}
              disabled={validating}
              title="Validar NCM com IA"
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={suggestNCM}
              disabled={suggesting || !formData.description}
              title="Sugerir NCM com IA Especialista"
              className="text-amber-600 hover:text-amber-700"
            >
              {suggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
            </Button>
          </div>
          {formData.ncm_description && (
            <p className="text-xs text-muted-foreground">{formData.ncm_description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm">CEST</Label>
          <Input
            value={formData.cest}
            onChange={(e) => onChange('cest', e.target.value)}
            placeholder="0000000"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Origem</Label>
          <Select
            value={formData.origin}
            onValueChange={(v) => onChange('origin', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {originOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ICMS e outros campos fiscais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            label="Alíquota ICMS" 
            tooltip="Alíquota de ICMS para emissão da nota fiscal de venda (%)" 
          />
          <Input
            type="number"
            step="0.01"
            value={formData.icms_rate || 0}
            onChange={(e) => onChange('icms_rate', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Peso líquido" 
            tooltip="Peso líquido do produto em kg para nota fiscal" 
          />
          <Input
            type="number"
            step="0.001"
            value={formData.net_weight}
            onChange={(e) => onChange('net_weight', parseFloat(e.target.value) || 0)}
            placeholder="0,000"
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Peso bruto" 
            tooltip="Peso bruto do produto com embalagem em kg para nota fiscal" 
          />
          <Input
            type="number"
            step="0.001"
            value={formData.gross_weight}
            onChange={(e) => onChange('gross_weight', parseFloat(e.target.value) || 0)}
            placeholder="0,000"
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Número FCI</Label>
          <Input
            value={formData.fci_number}
            onChange={(e) => onChange('fci_number', e.target.value)}
            placeholder="Ficha de Conteúdo de Importação"
          />
        </div>
      </div>

      {/* Produto específico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Produto específico</Label>
          <Select
            value={formData.specific_product}
            onValueChange={(v) => onChange('specific_product', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Não usar" />
            </SelectTrigger>
            <SelectContent>
              {specificProductOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Validação NCM */}
      {validation && (
        <Card className={validation.valid ? 'border-green-500' : 'border-destructive'}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {validation.valid ? (
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <X className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-medium">
                  {validation.valid ? 'NCM Válido' : 'NCM Inválido'}
                </p>
                {validation.ncmDescription && (
                  <p className="text-sm text-muted-foreground">{validation.ncmDescription}</p>
                )}
                {validation.suggestion && (
                  <p className="text-sm">
                    <strong>Sugestão:</strong> {validation.suggestion}
                  </p>
                )}
                {validation.notes && (
                  <p className="text-xs text-muted-foreground">{validation.notes}</p>
                )}
                {validation.confidence && (
                  <p className="text-xs text-muted-foreground">
                    Confiança: {validation.confidence}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sugestões NCM - IA Especialista */}
      {suggestions && suggestions.suggestions && suggestions.suggestions.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Sugestões de NCM (IA Especialista)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.suggestions.map((suggestion, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold">{suggestion.ncm}</span>
                    <Badge 
                      variant="outline" 
                      className={confidenceColors[suggestion.confidence]}
                    >
                      {suggestion.confidence}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 {suggestion.reason}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyNcmSuggestion(suggestion)}
                >
                  Usar
                </Button>
              </div>
            ))}
            {suggestions.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                ⚠️ {suggestions.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regras fiscais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Regras fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Este produto não possui regras específicas!
          </div>
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline">
              Adicionar regra
            </Button>
            <Button type="button" variant="secondary">
              📋 Regras por NCM
            </Button>
            <Button type="button" variant="secondary">
              👥 Regras por grupo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
