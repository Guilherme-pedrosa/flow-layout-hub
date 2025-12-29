import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronsUpDown, Plus, Package, Info } from "lucide-react";
import { NFEItem } from "./types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { CFOPS_ENTRADA_COMUNS, ALL_CFOPS_ENTRADA, sugerirCfopEntrada } from "@/lib/cfops";

interface Product {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
}

interface ItensNFeTableProps {
  itens: NFEItem[];
  products: Product[];
  onMapProduct: (itemIndex: number, productId: string) => void;
  onCriarProduto: (itemIndex: number) => void;
  onToggleCriarProduto: (itemIndex: number, criar: boolean) => void;
  onCfopEntradaChange: (itemIndex: number, cfop: string) => void;
}

export function ItensNFeTable({
  itens,
  products,
  onMapProduct,
  onCriarProduto,
  onToggleCriarProduto,
  onCfopEntradaChange,
}: ItensNFeTableProps) {
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  const validateNCM = (ncm: string) => {
    if (!ncm) return { valid: false, message: "NCM não informado" };
    if (ncm.length !== 8) return { valid: false, message: "NCM deve ter 8 dígitos" };
    if (!/^\d{8}$/.test(ncm)) return { valid: false, message: "NCM deve conter apenas números" };
    return { valid: true, message: "NCM válido" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Itens da Nota ({itens.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código XML</TableHead>
                <TableHead className="min-w-[200px]">Descrição</TableHead>
                <TableHead className="w-24">NCM</TableHead>
                <TableHead className="w-20">CFOP Saída</TableHead>
                <TableHead className="w-36">CFOP Entrada</TableHead>
                <TableHead className="w-16 text-right">Qtd</TableHead>
                <TableHead className="w-24 text-right">Valor Unit.</TableHead>
                <TableHead className="w-24 text-right">Valor Total</TableHead>
                <TableHead className="w-48">Produto</TableHead>
                <TableHead className="w-24 text-center">Auto Cadastrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => {
                const ncmValidation = validateNCM(item.ncm);
                const mappedProduct = products.find((p) => p.id === item.productId);

                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block">{item.descricao}</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm">
                          <p>{item.descricao}</p>
                          <div className="mt-2 text-xs space-y-1">
                            <p>ICMS: CST {item.impostos.icms.cst} | {formatCurrency(item.impostos.icms.valor)}</p>
                            <p>IPI: CST {item.impostos.ipi.cst} | {formatCurrency(item.impostos.ipi.valor)}</p>
                            <p>PIS: {formatCurrency(item.impostos.pis.valor)} | COFINS: {formatCurrency(item.impostos.cofins.valor)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={ncmValidation.valid ? "outline" : "destructive"}
                            className="font-mono text-xs cursor-help"
                          >
                            {item.ncm || "-"}
                            {!ncmValidation.valid && <Info className="h-3 w-3 ml-1" />}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{ncmValidation.message}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {item.cfopSaida}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.cfopEntrada}
                        onValueChange={(value) => onCfopEntradaChange(index, value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            Mais Usados
                          </div>
                          {CFOPS_ENTRADA_COMUNS.map((cfop) => (
                            <SelectItem key={cfop.codigo} value={cfop.codigo} className="text-xs">
                              {cfop.codigo} - {cfop.descricao.slice(0, 40)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.valorTotal)}</TableCell>
                    <TableCell>
                      {item.criarProduto ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          Será cadastrado
                        </Badge>
                      ) : (
                        <Popover
                          open={openPopover === index}
                          onOpenChange={(open) => setOpenPopover(open ? index : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-between text-xs"
                            >
                              {mappedProduct
                                ? `${mappedProduct.code} - ${mappedProduct.description.slice(0, 15)}...`
                                : "Vincular..."}
                              <ChevronsUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0">
                            <Command>
                              <CommandInput placeholder="Buscar produto..." />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">
                                      Nenhum produto encontrado
                                    </p>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setOpenPopover(null);
                                        onCriarProduto(index);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Cadastrar novo
                                    </Button>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {products
                                    .filter((p) => p.is_active)
                                    .map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        onSelect={() => {
                                          onMapProduct(index, product.id);
                                          setOpenPopover(null);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            item.productId === product.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {product.code} - {product.description}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.criarProduto || false}
                        onCheckedChange={(checked) =>
                          onToggleCriarProduto(index, checked as boolean)
                        }
                        disabled={!!item.productId}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
