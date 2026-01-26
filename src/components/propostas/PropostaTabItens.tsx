import { useState } from "react";
import { Plus, Trash2, GripVertical, Package, Wrench, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProposalItem, useProposals } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";

interface PropostaTabItensProps {
  proposalId: string;
  items: ProposalItem[];
  onChange: (items: ProposalItem[]) => void;
}

const tipoIcons = {
  produto: Package,
  servico: Wrench,
  plano: Calendar,
};

const tipoLabels = {
  produto: "Produto",
  servico: "Serviço",
  plano: "Plano",
};

export function PropostaTabItens({ proposalId, items, onChange }: PropostaTabItensProps) {
  const { saveProposalItems, recalculateTotals } = useProposals();
  const [isSaving, setIsSaving] = useState(false);

  const handleAddItem = () => {
    const newItem: Partial<ProposalItem> = {
      id: `temp-${Date.now()}`,
      proposal_id: proposalId,
      tipo: "servico",
      descricao: "",
      detalhes: "",
      centro_custo: "",
      unidade: "SV",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      observacao: "",
      ordem: items.length,
    };
    onChange([...items, newItem as ProposalItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleItemChange = (index: number, field: keyof ProposalItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular valor_total do item
    if (field === "quantidade" || field === "valor_unitario") {
      const qtd = field === "quantidade" ? value : newItems[index].quantidade;
      const unit = field === "valor_unitario" ? value : newItems[index].valor_unitario;
      newItems[index].valor_total = qtd * unit;
    }
    
    onChange(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProposalItems.mutateAsync({
        proposalId,
        items: items.map(({ id, ...rest }) => ({
          ...rest,
          // Remove temp IDs
          ...(id.startsWith("temp-") ? {} : { id }),
        })),
      });
      await recalculateTotals(proposalId);
    } finally {
      setIsSaving(false);
    }
  };

  const totalGeral = items.reduce((sum, item) => sum + (item.valor_total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Itens da Proposta</h3>
          <p className="text-sm text-muted-foreground">
            Adicione produtos, serviços ou planos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Itens"}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum item adicionado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione produtos ou serviços à proposta
            </p>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const Icon = tipoIcons[item.tipo];
            return (
              <Card key={item.id || index}>
                <CardContent className="pt-4">
                  <div className="flex gap-4">
                    <div className="flex items-start pt-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={item.tipo}
                            onValueChange={(v) => handleItemChange(index, "tipo", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="servico">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Serviço
                                </div>
                              </SelectItem>
                              <SelectItem value="produto">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Produto
                                </div>
                              </SelectItem>
                              <SelectItem value="plano">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Plano
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3 space-y-2">
                          <Label>Centro de Custo / Unidade</Label>
                          <Input
                            value={item.centro_custo || ""}
                            onChange={(e) => handleItemChange(index, "centro_custo", e.target.value)}
                            placeholder="Ex: IZ RESTAURANTE LTDA"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) => handleItemChange(index, "descricao", e.target.value)}
                          placeholder="Descrição do item..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Detalhes</Label>
                        <Textarea
                          value={item.detalhes || ""}
                          onChange={(e) => handleItemChange(index, "detalhes", e.target.value)}
                          placeholder="Detalhes adicionais do serviço ou produto..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Label>Unid.</Label>
                          <Input
                            value={item.unidade}
                            onChange={(e) => handleItemChange(index, "unidade", e.target.value)}
                            placeholder="SV"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Qtde</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(index, "quantidade", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Unit.</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor_unitario}
                            onChange={(e) => handleItemChange(index, "valor_unitario", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Valor Total</Label>
                          <Input
                            value={formatCurrency(item.quantidade * item.valor_unitario)}
                            disabled
                            className="bg-muted font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Total */}
          <Card className="bg-primary/5 border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Valor Total da Proposta</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalGeral)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
