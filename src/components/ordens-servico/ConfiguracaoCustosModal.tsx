import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOsCustos, ConfigCustosUnidade } from "@/hooks/useOsCustos";
import { Save, Calculator, DollarSign, Car, AlertTriangle, Percent } from "lucide-react";

interface ConfiguracaoCustosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfiguracaoCustosModal({ open, onOpenChange }: ConfiguracaoCustosModalProps) {
  const { config, hasConfig, saveConfig, isLoading } = useOsCustos();
  
  const [formData, setFormData] = useState<Partial<ConfigCustosUnidade>>({});
  
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = async () => {
    await saveConfig.mutateAsync(formData);
    onOpenChange(false);
  };

  const handleChange = (field: keyof ConfigCustosUnidade, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Configuração de Custos
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="custos-fixos" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="custos-fixos">Custos Fixos</TabsTrigger>
            <TabsTrigger value="mao-obra">Mão de Obra</TabsTrigger>
            <TabsTrigger value="deslocamento">Deslocamento</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="custos-fixos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rateio de Custos Fixos</CardTitle>
                <CardDescription>
                  Configure como os custos fixos da empresa serão alocados nas Ordens de Serviço
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custo Fixo Mensal Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_fixo_mensal_total || ''}
                    onChange={(e) => handleChange('custo_fixo_mensal_total', parseFloat(e.target.value) || 0)}
                    placeholder="50000.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Soma de todos os custos fixos (aluguel, energia, administrativo, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Base Horas Produtivas/Mês</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.base_horas_produtivas_empresa_mes || ''}
                    onChange={(e) => handleChange('base_horas_produtivas_empresa_mes', parseFloat(e.target.value) || 0)}
                    placeholder="176"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total de horas produtivas da equipe por mês
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Método de Rateio</Label>
                  <Select 
                    value={formData.metodo_rateio || 'por_hora'}
                    onValueChange={(v) => handleChange('metodo_rateio', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="por_hora">Por Hora Trabalhada</SelectItem>
                      <SelectItem value="por_os">Por OS (fixo)</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.metodo_rateio === 'hibrido' && (
                  <>
                    <div className="space-y-2">
                      <Label>Peso Hora (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(formData.peso_hora ?? 0.7) * 100}
                        onChange={(e) => handleChange('peso_hora', (parseFloat(e.target.value) || 0) / 100)}
                        placeholder="70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Peso OS (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(formData.peso_os ?? 0.3) * 100}
                        onChange={(e) => handleChange('peso_os', (parseFloat(e.target.value) || 0) / 100)}
                        placeholder="30"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mao-obra" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custo de Mão de Obra Técnica</CardTitle>
                <CardDescription>
                  Configure o salário médio ou o custo/hora direto dos técnicos
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salário Médio Técnico (R$/mês)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.salario_medio_tecnico_mensal || ''}
                    onChange={(e) => handleChange('salario_medio_tecnico_mensal', parseFloat(e.target.value) || null)}
                    placeholder="3500.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OU Custo/Hora Direto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_hora_tecnica_direto || ''}
                    onChange={(e) => handleChange('custo_hora_tecnica_direto', parseFloat(e.target.value) || null)}
                    placeholder="45.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se preenchido, ignora o cálculo baseado em salário
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Encargos (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.encargos_percent || ''}
                    onChange={(e) => handleChange('encargos_percent', parseFloat(e.target.value) || 0)}
                    placeholder="80"
                  />
                  <p className="text-xs text-muted-foreground">
                    INSS, FGTS, férias, 13º, etc.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Aproveitamento (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.aproveitamento_percent || ''}
                    onChange={(e) => handleChange('aproveitamento_percent', parseFloat(e.target.value) || 0)}
                    placeholder="75"
                  />
                  <p className="text-xs text-muted-foreground">
                    % do tempo em atividades produtivas
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Horas/Mês Base</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.horas_mes_base || ''}
                    onChange={(e) => handleChange('horas_mes_base', parseFloat(e.target.value) || 0)}
                    placeholder="220"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deslocamento" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Custos de Deslocamento
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custo por KM (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_por_km || ''}
                    onChange={(e) => handleChange('custo_por_km', parseFloat(e.target.value) || 0)}
                    placeholder="1.50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Combustível + manutenção + depreciação
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Custo/Hora Deslocamento (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_hora_deslocamento || ''}
                    onChange={(e) => handleChange('custo_hora_deslocamento', parseFloat(e.target.value) || null)}
                    placeholder="Usa custo/hora técnico"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se vazio, usa o custo/hora do técnico
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Custos Financeiros e Impostos
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taxa Capital Mensal (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.taxa_capital_mensal_percent || ''}
                    onChange={(e) => handleChange('taxa_capital_mensal_percent', parseFloat(e.target.value) || 0)}
                    placeholder="2.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IOF (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.iof_percent || ''}
                    onChange={(e) => handleChange('iof_percent', parseFloat(e.target.value) || 0)}
                    placeholder="0.38"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo Recebimento Padrão (dias)</Label>
                  <Input
                    type="number"
                    value={formData.prazo_recebimento_dias_padrao || ''}
                    onChange={(e) => handleChange('prazo_recebimento_dias_padrao', parseInt(e.target.value) || 0)}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alíquota Imposto Padrão (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.aliquota_imposto_padrao_percent || ''}
                    onChange={(e) => handleChange('aliquota_imposto_padrao_percent', parseFloat(e.target.value) || 0)}
                    placeholder="15.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Simples Nacional, Lucro Presumido, etc.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Margem Mínima para Alerta (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.margem_minima_alerta_percent || ''}
                    onChange={(e) => handleChange('margem_minima_alerta_percent', parseFloat(e.target.value) || 0)}
                    placeholder="15.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deslocamento Máximo (% da Receita)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.deslocamento_max_percent_receita || ''}
                    onChange={(e) => handleChange('deslocamento_max_percent_receita', parseFloat(e.target.value) || 0)}
                    placeholder="20.00"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveConfig.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
