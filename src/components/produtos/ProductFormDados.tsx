import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RefreshCw, Info, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useProductGroups, ProductGroup, ProductSubgroup } from "@/hooks/useProductGroups";

interface UnitConversion {
  inputQty: number;
  inputUnit: string;
  outputQty: number;
  outputUnit: string;
}

interface ProductFormDadosProps {
  formData: {
    code: string;
    description: string;
    barcode: string;
    product_group: string;
    group_id: string;
    subgroup_id: string;
    controls_stock: boolean;
    has_invoice: boolean;
    has_variations: boolean;
    has_composition: boolean;
    unit: string;
    unit_conversions: UnitConversion[];
    supplier_code: string;
  };
  onChange: (field: string, value: any) => void;
  onGenerateCode: () => void;
  onGenerateBarcode: () => void;
  isCodeLoading?: boolean;
  isBarcodeLoading?: boolean;
}

const LabelWithTooltip = ({ label, tooltip, required }: { label: string; tooltip: string; required?: boolean }) => (
  <div className="flex items-center gap-1">
    <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
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

export function ProductFormDados({ 
  formData, 
  onChange, 
  onGenerateCode, 
  onGenerateBarcode,
  isCodeLoading,
  isBarcodeLoading 
}: ProductFormDadosProps) {
  const { groups, subgroups, fetchSubgroups, createGroup, createSubgroup } = useProductGroups();
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showNewSubgroupDialog, setShowNewSubgroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newSubgroupName, setNewSubgroupName] = useState('');

  const filteredSubgroups = formData.group_id 
    ? subgroups.filter(sg => sg.group_id === formData.group_id)
    : [];

  const handleGroupChange = (groupId: string) => {
    onChange('group_id', groupId);
    onChange('subgroup_id', ''); // Reset subgroup when group changes
    fetchSubgroups(groupId);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const group = await createGroup(newGroupName);
    if (group) {
      onChange('group_id', group.id);
      setNewGroupName('');
      setShowNewGroupDialog(false);
    }
  };

  const handleCreateSubgroup = async () => {
    if (!newSubgroupName.trim() || !formData.group_id) return;
    const subgroup = await createSubgroup(formData.group_id, newSubgroupName);
    if (subgroup) {
      onChange('subgroup_id', subgroup.id);
      setNewSubgroupName('');
      setShowNewSubgroupDialog(false);
    }
  };

  const addUnitConversion = () => {
    const newConversion: UnitConversion = {
      inputQty: 1,
      inputUnit: 'UN',
      outputQty: 1,
      outputUnit: 'UN',
    };
    onChange('unit_conversions', [...formData.unit_conversions, newConversion]);
  };

  const updateConversion = (index: number, field: keyof UnitConversion, value: any) => {
    const updated = [...formData.unit_conversions];
    updated[index] = { ...updated[index], [field]: value };
    onChange('unit_conversions', updated);
  };

  const removeConversion = (index: number) => {
    onChange('unit_conversions', formData.unit_conversions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Dados principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            label="Nome" 
            tooltip="Nome do produto que será exibido no sistema" 
            required 
          />
          <Input
            value={formData.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Nome do produto"
          />
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Código" 
            tooltip="Código único de 5 dígitos gerado automaticamente pelo sistema" 
            required 
          />
          <div className="flex gap-2">
            <Input
              value={formData.code}
              onChange={(e) => onChange('code', e.target.value)}
              placeholder="00000"
              maxLength={5}
              className="flex-1 font-mono"
            />
            <Button type="button" variant="outline" onClick={onGenerateCode} disabled={isCodeLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isCodeLoading ? 'animate-spin' : ''}`} />
              Gerar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Referência" 
            tooltip="Código do fornecedor para identificação do produto" 
          />
          <Input
            value={formData.supplier_code}
            onChange={(e) => onChange('supplier_code', e.target.value)}
            placeholder="Código do fornecedor"
          />
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Código de barra" 
            tooltip="Código de barras EAN-13 para etiqueta do produto. Pode ser gerado automaticamente caso não tenha." 
          />
          <div className="flex gap-2">
            <Input
              value={formData.barcode}
              onChange={(e) => onChange('barcode', e.target.value)}
              placeholder="7890000000000"
              className="flex-1 font-mono"
            />
            <Button type="button" variant="outline" onClick={onGenerateBarcode} disabled={isBarcodeLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isBarcodeLoading ? 'animate-spin' : ''}`} />
              Gerar
            </Button>
          </div>
        </div>
      </div>

      {/* Segunda linha - Grupo e Subgrupo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            label="Grupo" 
            tooltip="Grupo principal para organização dos produtos" 
          />
          <div className="flex gap-2">
            <Select value={formData.group_id} onValueChange={handleGroupChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowNewGroupDialog(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Subgrupo" 
            tooltip="Subgrupo para organização mais detalhada" 
          />
          <div className="flex gap-2">
            <Select 
              value={formData.subgroup_id} 
              onValueChange={(v) => onChange('subgroup_id', v)}
              disabled={!formData.group_id}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={formData.group_id ? "Selecione um subgrupo" : "Selecione um grupo primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {filteredSubgroups.map(subgroup => (
                  <SelectItem key={subgroup.id} value={subgroup.id}>
                    {subgroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={() => setShowNewSubgroupDialog(true)}
              disabled={!formData.group_id}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Unidade" 
            tooltip="Unidade de medida padrão do produto" 
          />
          <Input
            value={formData.unit}
            onChange={(e) => onChange('unit', e.target.value)}
            placeholder="UN"
          />
        </div>
      </div>

      {/* Opções de controle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            label="Movimenta estoque?" 
            tooltip="Define se o produto será controlado em estoque" 
          />
          <Select
            value={formData.controls_stock ? 'sim' : 'nao'}
            onValueChange={(v) => onChange('controls_stock', v === 'sim')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Habilitar nota fiscal?" 
            tooltip="Define se o produto aparece em notas fiscais" 
          />
          <Select
            value={formData.has_invoice ? 'sim' : 'nao'}
            onValueChange={(v) => onChange('has_invoice', v === 'sim')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Possui variações?" 
            tooltip="Indica se o produto possui variações como cor, tamanho, etc." 
          />
          <Select
            value={formData.has_variations ? 'sim' : 'nao'}
            onValueChange={(v) => onChange('has_variations', v === 'sim')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip 
            label="Possui composição?" 
            tooltip="Indica se o produto é composto por outros produtos" 
          />
          <Select
            value={formData.has_composition ? 'sim' : 'nao'}
            onValueChange={(v) => onChange('has_composition', v === 'sim')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversão de unidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            ↔ Conversão de unidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-muted/50">
            <AlertDescription>
              A conversão de unidades permite que você compre em uma unidade de medida e venda em outra unidade de medida.
            </AlertDescription>
          </Alert>

          {formData.unit_conversions.map((conversion, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={conversion.inputQty}
                  onChange={(e) => updateConversion(index, 'inputQty', parseFloat(e.target.value) || 0)}
                  className="w-20"
                />
                <Input
                  value={conversion.inputUnit}
                  onChange={(e) => updateConversion(index, 'inputUnit', e.target.value)}
                  placeholder="Unidade"
                />
              </div>
              
              <div className="text-center text-muted-foreground">
                equivale a
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={conversion.outputQty}
                  onChange={(e) => updateConversion(index, 'outputQty', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <Input
                  value={conversion.outputUnit}
                  onChange={(e) => updateConversion(index, 'outputUnit', e.target.value)}
                  placeholder="Unidade"
                />
              </div>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeConversion(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addUnitConversion}>
            + Adicionar conversão
          </Button>
        </CardContent>
      </Card>

      {/* Dialog para criar novo grupo */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Eletrônicos, Acessórios..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar novo subgrupo */}
      <Dialog open={showNewSubgroupDialog} onOpenChange={setShowNewSubgroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Subgrupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Subgrupo</Label>
              <Input
                value={newSubgroupName}
                onChange={(e) => setNewSubgroupName(e.target.value)}
                placeholder="Ex: Smartphones, Cabos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSubgroupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubgroup} disabled={!newSubgroupName.trim()}>
              Criar Subgrupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
