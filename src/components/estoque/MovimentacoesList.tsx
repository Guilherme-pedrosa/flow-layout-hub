import { useState } from "react";
import { useStockMovements, StockMovementInsert } from "@/hooks/useStockMovements";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Search, RotateCcw, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const movementTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ENTRADA_COMPRA: { label: "Entrada Compra", variant: "default" },
  SAIDA_VENDA: { label: "Saída Venda", variant: "destructive" },
  AJUSTE_ENTRADA: { label: "Ajuste Entrada", variant: "outline" },
  AJUSTE_SAIDA: { label: "Ajuste Saída", variant: "secondary" },
  ESTORNO_ENTRADA: { label: "Estorno Entrada", variant: "secondary" },
  ESTORNO_SAIDA: { label: "Estorno Saída", variant: "secondary" },
};

export function MovimentacoesList() {
  const { movements, isLoading, createMovement, reverseMovement } = useStockMovements();
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const [formData, setFormData] = useState({
    product_id: "",
    type: "AJUSTE_ENTRADA",
    quantity: "",
    reason: "",
  });

  const filteredMovements = movements.filter(
    (m) =>
      m.product?.description?.toLowerCase().includes(search.toLowerCase()) ||
      m.product?.code?.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNew = () => {
    setFormData({
      product_id: "",
      type: "AJUSTE_ENTRADA",
      quantity: "",
      reason: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const movementData: StockMovementInsert = {
      product_id: formData.product_id,
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      reason: formData.reason,
      reference_type: "adjustment",
    };

    await createMovement.mutateAsync(movementData);
    setDialogOpen(false);
  };

  const handleReverse = async (movementId: string) => {
    const movement = movements.find((m) => m.id === movementId);
    if (movement) {
      await reverseMovement.mutateAsync(movement);
    }
  };

  const selectedProduct = products.find((p) => p.id === formData.product_id);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((movement) => {
                const typeInfo = movementTypeLabels[movement.type] || {
                  label: movement.type,
                  variant: "outline" as const,
                };
                const canReverse = !movement.type.includes("ESTORNO");

                return (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {movement.product?.code}
                        </span>
                        <br />
                        {movement.product?.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {movement.type.includes("SAIDA") || movement.type === "ESTORNO_ENTRADA"
                        ? `-${movement.quantity}`
                        : `+${movement.quantity}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {movement.reason || "-"}
                    </TableCell>
                    <TableCell>
                      {canReverse && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReverse(movement.id)}
                          title="Estornar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre um ajuste manual de estoque
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productOpen}
                    className="w-full justify-between"
                  >
                    {selectedProduct
                      ? `${selectedProduct.code} - ${selectedProduct.description}`
                      : "Selecione um produto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar produto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {products
                          .filter((p) => p.is_active)
                          .map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.code} ${product.description}`}
                              onSelect={() => {
                                setFormData({ ...formData, product_id: product.id });
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.product_id === product.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="font-mono text-xs mr-2">{product.code}</span>
                              {product.description}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Movimentação *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AJUSTE_ENTRADA">Ajuste de Entrada</SelectItem>
                    <SelectItem value="AJUSTE_SAIDA">Ajuste de Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Descreva o motivo do ajuste..."
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMovement.isPending || !formData.product_id}
              >
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
