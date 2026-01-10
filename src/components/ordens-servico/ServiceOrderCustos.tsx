import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  TrendingUp,
  TrendingDown,
  Settings,
  Save,
  DollarSign,
  Car,
  Clock,
  Package,
  Wrench,
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useOsCustos, calcularCustos, gerarAlertas, OsCusto, AlertaCusto } from "@/hooks/useOsCustos";
import { cn } from "@/lib/utils";

interface ServiceOrderCustosProps {
  serviceOrderId?: string;
  receitaBruta: number;
  isEditing?: boolean;
  onCustoChange?: (custoTotal: number, margem: number) => void;
}

export function ServiceOrderCustos({ 
  serviceOrderId, 
  receitaBruta,
  isEditing = false,
  onCustoChange 
}: ServiceOrderCustosProps) {
  const { config, osCusto, isLoading, hasConfig, saveOsCusto, registrarOverride } = useOsCustos(serviceOrderId);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideField, setOverrideField] = useState<string>('');
  const [overrideMotivo, setOverrideMotivo] = useState('');
  const [pendingValue, setPendingValue] = useState<any>(null);
  
  // Estado local dos campos editáveis
  const [formData, setFormData] = useState<Partial<OsCusto>>({
    horas_tecnicas: 0,
    km_total: 0,
    tempo_deslocamento_horas: 0,
    custo_pecas: 0,
    custo_pecas_override: false,
    servicos_externos: 0,
    pedagio: 0,
    estacionamento: 0,
    diaria: 0,
    refeicao: 0,
    desconto_concedido: 0,
    aliquota_imposto_override: null,
    prazo_recebimento_dias: null,
  });

  // Carregar dados existentes
  useEffect(() => {
    if (osCusto) {
      setFormData({
        horas_tecnicas: osCusto.horas_tecnicas || 0,
        km_total: osCusto.km_total || 0,
        tempo_deslocamento_horas: osCusto.tempo_deslocamento_horas || 0,
        custo_pecas: osCusto.custo_pecas || 0,
        custo_pecas_override: osCusto.custo_pecas_override || false,
        servicos_externos: osCusto.servicos_externos || 0,
        pedagio: osCusto.pedagio || 0,
        estacionamento: osCusto.estacionamento || 0,
        diaria: osCusto.diaria || 0,
        refeicao: osCusto.refeicao || 0,
        desconto_concedido: osCusto.desconto_concedido || 0,
        aliquota_imposto_override: osCusto.aliquota_imposto_override,
        prazo_recebimento_dias: osCusto.prazo_recebimento_dias,
      });
    }
  }, [osCusto]);

  // Calcular custos
  const custosCalculados = useMemo(() => {
    return calcularCustos(formData, config, receitaBruta);
  }, [formData, config, receitaBruta]);

  // Gerar alertas
  const alertas = useMemo(() => {
    return gerarAlertas(custosCalculados, config);
  }, [custosCalculados, config]);

  // Notificar mudanças
  useEffect(() => {
    onCustoChange?.(custosCalculados.custo_total_real, custosCalculados.margem_real_percent);
  }, [custosCalculados, onCustoChange]);

  const handleChange = (field: string, value: number | null) => {
    // Campos que requerem motivo
    if (field === 'custo_pecas' && formData.custo_pecas !== value) {
      setOverrideField('custo_pecas');
      setPendingValue(value);
      setShowOverrideDialog(true);
      return;
    }
    if (field === 'aliquota_imposto_override' && value !== null) {
      setOverrideField('aliquota_imposto');
      setPendingValue(value);
      setShowOverrideDialog(true);
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOverrideConfirm = () => {
    if (!overrideMotivo.trim()) return;
    
    if (overrideField === 'custo_pecas') {
      setFormData(prev => ({ 
        ...prev, 
        custo_pecas: pendingValue,
        custo_pecas_override: true,
        custo_pecas_motivo: overrideMotivo
      }));
    } else if (overrideField === 'aliquota_imposto') {
      setFormData(prev => ({ 
        ...prev, 
        aliquota_imposto_override: pendingValue,
        aliquota_imposto_motivo: overrideMotivo
      }));
    }
    
    setShowOverrideDialog(false);
    setOverrideMotivo('');
    setOverrideField('');
    setPendingValue(null);
  };

  const handleSave = async () => {
    await saveOsCusto.mutateAsync({
      ...formData,
      receitaBruta,
    });
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (tipo: string) => {
    switch (tipo) {
      case 'error': return 'destructive';
      default: return 'default';
    }
  };

  const margemColor = custosCalculados.margem_real_percent < 0 
    ? 'text-destructive' 
    : custosCalculados.margem_real_percent < config.margem_minima_alerta_percent 
      ? 'text-yellow-600' 
      : 'text-green-600';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5" />
              Análise de Custos e Margem
            </CardTitle>
            {isEditing && (
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={saveOsCusto.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar Custos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="space-y-2">
              {alertas.map((alerta, idx) => (
                <Alert key={idx} variant={getAlertVariant(alerta.tipo) as any}>
                  {getAlertIcon(alerta.tipo)}
                  <AlertDescription>{alerta.mensagem}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Resumo Principal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Receita Líquida</p>
              <p className="text-xl font-bold">{formatCurrency(custosCalculados.receita_liquida)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Custo Total Real</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(custosCalculados.custo_total_real)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Lucro Real</p>
              <p className={cn("text-xl font-bold", custosCalculados.lucro_real >= 0 ? 'text-green-600' : 'text-destructive')}>
                {formatCurrency(custosCalculados.lucro_real)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Margem Real</p>
              <div className="flex items-center justify-center gap-1">
                {custosCalculados.margem_real_percent >= 0 
                  ? <TrendingUp className="h-5 w-5 text-green-600" />
                  : <TrendingDown className="h-5 w-5 text-destructive" />
                }
                <p className={cn("text-xl font-bold", margemColor)}>
                  {custosCalculados.margem_real_percent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Campos Editáveis */}
          {isEditing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Horas Técnicas
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.horas_tecnicas}
                  onChange={(e) => setFormData(prev => ({ ...prev, horas_tecnicas: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  KM Total
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.km_total}
                  onChange={(e) => setFormData(prev => ({ ...prev, km_total: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo Deslocamento (h)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={formData.tempo_deslocamento_horas}
                  onChange={(e) => setFormData(prev => ({ ...prev, tempo_deslocamento_horas: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Custo Peças
                  {formData.custo_pecas_override && <Badge variant="outline" className="ml-1 text-xs">Override</Badge>}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.custo_pecas}
                  onChange={(e) => handleChange('custo_pecas', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Serviços Externos
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.servicos_externos}
                  onChange={(e) => setFormData(prev => ({ ...prev, servicos_externos: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Pedágio</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pedagio}
                  onChange={(e) => setFormData(prev => ({ ...prev, pedagio: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estacionamento</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.estacionamento}
                  onChange={(e) => setFormData(prev => ({ ...prev, estacionamento: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Diária</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.diaria}
                  onChange={(e) => setFormData(prev => ({ ...prev, diaria: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Refeição</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.refeicao}
                  onChange={(e) => setFormData(prev => ({ ...prev, refeicao: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Desconto Concedido
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.desconto_concedido}
                  onChange={(e) => setFormData(prev => ({ ...prev, desconto_concedido: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Receipt className="h-3 w-3" />
                  Alíquota Imposto (%)
                  {formData.aliquota_imposto_override !== null && <Badge variant="outline" className="ml-1 text-xs">Override</Badge>}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={`${config.aliquota_imposto_padrao_percent}%`}
                  value={formData.aliquota_imposto_override ?? ''}
                  onChange={(e) => handleChange('aliquota_imposto_override', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo Recebimento (dias)</Label>
                <Input
                  type="number"
                  placeholder={`${config.prazo_recebimento_dias_padrao}`}
                  value={formData.prazo_recebimento_dias ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, prazo_recebimento_dias: e.target.value ? parseInt(e.target.value) : null }))}
                />
              </div>
            </div>
          )}

          {/* Detalhamento Expansível */}
          <Collapsible open={showDetalhes} onOpenChange={setShowDetalhes}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Detalhamento dos Custos
                </span>
                {showDetalhes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mão de Obra */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Mão de Obra Direta
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Custo/hora técnica: {formatCurrency(custosCalculados.custo_hora_tecnica)}</p>
                    <p>Horas trabalhadas: {formData.horas_tecnicas}h</p>
                    <p className="font-medium text-foreground">
                      Total: {formatCurrency(custosCalculados.custo_mao_obra_direta)}
                    </p>
                  </div>
                </div>

                {/* Deslocamento */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Custos de Deslocamento
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>KM: {formData.km_total} × {formatCurrency(config.custo_por_km)}/km</p>
                    <p>Tempo: {formData.tempo_deslocamento_horas}h × {formatCurrency(config.custo_hora_deslocamento || custosCalculados.custo_hora_tecnica)}/h</p>
                    <p>Despesas viagem: {formatCurrency(custosCalculados.detalhamento.despesas_viagem)}</p>
                    <p className="font-medium text-foreground">
                      Total: {formatCurrency(custosCalculados.custo_deslocamento)}
                    </p>
                  </div>
                </div>

                {/* Custos Diretos */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Outros Custos Diretos
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Peças: {formatCurrency(custosCalculados.detalhamento.custo_pecas)}</p>
                    <p>Serviços externos: {formatCurrency(custosCalculados.detalhamento.servicos_externos)}</p>
                    <p className="font-medium text-foreground">
                      Custos diretos totais: {formatCurrency(custosCalculados.custos_diretos_total)}
                    </p>
                  </div>
                </div>

                {/* Custo Fixo Alocado */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Custo Fixo Alocado
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Custo fixo mensal: {formatCurrency(config.custo_fixo_mensal_total)}</p>
                    <p>Base horas/mês: {config.base_horas_produtivas_empresa_mes}h</p>
                    <p>Custo fixo/hora: {formatCurrency(custosCalculados.custo_fixo_por_hora)}</p>
                    <p>Método: {config.metodo_rateio}</p>
                    <p className="font-medium text-foreground">
                      Alocado nesta OS: {formatCurrency(custosCalculados.custo_fixo_alocado)}
                    </p>
                  </div>
                </div>

                {/* Impostos */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Impostos Estimados
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Receita líquida: {formatCurrency(custosCalculados.receita_liquida)}</p>
                    <p>Alíquota: {formData.aliquota_imposto_override ?? config.aliquota_imposto_padrao_percent}%</p>
                    <p className="font-medium text-foreground">
                      Impostos: {formatCurrency(custosCalculados.impostos_estimados)}
                    </p>
                  </div>
                </div>

                {/* Custo Financeiro */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Custo Financeiro
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Prazo recebimento: {formData.prazo_recebimento_dias ?? config.prazo_recebimento_dias_padrao} dias</p>
                    <p>Taxa capital: {config.taxa_capital_mensal_percent}% a.m.</p>
                    <p>IOF: {config.iof_percent}%</p>
                    <p className="font-medium text-foreground">
                      Custo financeiro: {formatCurrency(custosCalculados.custo_financeiro_recebimento)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fórmulas */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Fórmulas Utilizadas</h4>
                <div className="text-xs font-mono space-y-1 text-muted-foreground">
                  <p>custo_hora = salário × (1 + encargos%) / (horas_base × aproveitamento%)</p>
                  <p>custo_mao_obra = horas_tecnicas × custo_hora</p>
                  <p>custo_deslocamento = (km × custo_km) + (tempo × custo_hora) + despesas</p>
                  <p>custo_fixo_alocado = horas × (custo_fixo_mensal / base_horas_mes)</p>
                  <p>impostos = receita_liquida × aliquota%</p>
                  <p>custo_financeiro = receita × taxa% × (prazo/30) + receita × iof%</p>
                  <p>margem% = (receita_liquida - custo_total) / receita_liquida × 100</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Dialog para Override */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa para Alteração</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Motivo da alteração *</Label>
            <Textarea
              value={overrideMotivo}
              onChange={(e) => setOverrideMotivo(e.target.value)}
              placeholder="Informe o motivo da alteração manual deste valor..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Esta alteração será registrada no log de auditoria.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOverrideConfirm} disabled={!overrideMotivo.trim()}>
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
