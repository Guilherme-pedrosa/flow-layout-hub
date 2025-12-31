import { useState, useEffect, useCallback } from "react";
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
import { Check, ChevronsUpDown, Plus, Package, Info, Lightbulb, Loader2, X } from "lucide-react";
import { NFEItem } from "./types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { CFOPS_ENTRADA_COMUNS } from "@/lib/cfops";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
}

interface ProductMatch {
  id: string;
  code: string;
  description: string;
  score: number;
  matchType: 'exact_code' | 'normalized_code' | 'description_similarity';
}

interface ItemSuggestion {
  matches: ProductMatch[];
  loading: boolean;
  searched: boolean;
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
  const [suggestions, setSuggestions] = useState<Record<number, ItemSuggestion>>({});

  // Search for product matches when items change
  const searchProductMatches = useCallback(async (itemIndex: number, item: NFEItem) => {
    // Skip if already has product mapped
    if (item.productId || item.criarProduto) return;

    // Mark as loading
    setSuggestions(prev => ({
      ...prev,
      [itemIndex]: { matches: [], loading: true, searched: false }
    }));

    try {
      const { data, error } = await supabase.functions.invoke('find-product-matches', {
        body: { 
          codigo: item.codigo, 
          descricao: item.descricao 
        }
      });

      if (error) throw error;

      setSuggestions(prev => ({
        ...prev,
        [itemIndex]: { 
          matches: data?.matches || [], 
          loading: false, 
          searched: true 
        }
      }));
    } catch (error) {
      console.error('Error searching product matches:', error);
      setSuggestions(prev => ({
        ...prev,
        [itemIndex]: { matches: [], loading: false, searched: true }
      }));
    }
  }, []);

  // Search for all items when component mounts or items change
  useEffect(() => {
    itens.forEach((item, index) => {
      // Only search if not already searched and no product mapped
      if (!suggestions[index]?.searched && !item.productId && !item.criarProduto) {
        searchProductMatches(index, item);
      }
    });
  }, [itens, searchProductMatches]);

  const validateNCM = (ncm: string) => {
    if (!ncm) return { valid: false, message: "NCM não informado" };
    if (ncm.length !== 8) return { valid: false, message: "NCM deve ter 8 dígitos" };
    if (!/^\d{8}$/.test(ncm)) return { valid: false, message: "NCM deve conter apenas números" };
    return { valid: true, message: "NCM válido" };
  };

  const handleAcceptSuggestion = (itemIndex: number, productId: string) => {
    onMapProduct(itemIndex, productId);
  };

  const handleRejectSuggestion = (itemIndex: number) => {
    // Clear suggestions for this item
    setSuggestions(prev => ({
      ...prev,
      [itemIndex]: { matches: [], loading: false, searched: true }
    }));
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "outline" => {
    if (score >= 90) return "default";
    if (score >= 70) return "secondary";
    return "outline";
  };

  const getMatchTypeLabel = (matchType: string): string => {
    switch (matchType) {
      case 'exact_code': return 'Código exato';
      case 'normalized_code': return 'Código similar';
      case 'description_similarity': return 'Descrição similar';
      default: return 'Sugestão';
    }
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
                <TableHead className="w-64">Produto</TableHead>
                <TableHead className="w-24 text-center">Auto Cadastrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => {
                const ncmValidation = validateNCM(item.ncm);
                const mappedProduct = products.find((p) => p.id === item.productId);
                const suggestion = suggestions[index];
                const bestMatch = suggestion?.matches?.[0];
                const hasSuggestion = bestMatch && bestMatch.score >= 70 && !item.productId && !item.criarProduto;

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
                      {/* Loading state */}
                      {suggestion?.loading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Buscando...
                        </div>
                      )}

                      {/* Already marked to create */}
                      {item.criarProduto && !suggestion?.loading && (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          Será cadastrado
                        </Badge>
                      )}

                      {/* Already mapped */}
                      {mappedProduct && !item.criarProduto && !suggestion?.loading && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                          <Check className="h-3 w-3 mr-1" />
                          {mappedProduct.code}
                        </Badge>
                      )}

                      {/* Suggestion available */}
                      {hasSuggestion && !suggestion?.loading && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 cursor-pointer flex-1 min-w-0">
                                  <Lightbulb className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                  <span className="text-xs truncate">
                                    {bestMatch.code}
                                  </span>
                                  <Badge 
                                    variant={getScoreBadgeVariant(bestMatch.score)} 
                                    className="text-[10px] h-4 px-1 flex-shrink-0"
                                  >
                                    {bestMatch.score}%
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-medium">{bestMatch.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {getMatchTypeLabel(bestMatch.matchType)} • Score: {bestMatch.score}%
                                </p>
                                {suggestion.matches.length > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{suggestion.matches.length - 1} outras sugestões
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                              onClick={() => handleAcceptSuggestion(index, bestMatch.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRejectSuggestion(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Show dropdown to see other options */}
                          <Popover
                            open={openPopover === index}
                            onOpenChange={(open) => setOpenPopover(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-center text-[10px] h-5 text-muted-foreground hover:text-foreground"
                              >
                                Ver outras opções
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
                                  {suggestion.matches.length > 0 && (
                                    <CommandGroup heading="Sugestões">
                                      {suggestion.matches.map((match) => (
                                        <CommandItem
                                          key={match.id}
                                          onSelect={() => {
                                            onMapProduct(index, match.id);
                                            setOpenPopover(null);
                                          }}
                                        >
                                          <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
                                          <span className="flex-1 truncate">
                                            {match.code} - {match.description}
                                          </span>
                                          <Badge variant="secondary" className="ml-2 text-[10px]">
                                            {match.score}%
                                          </Badge>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="Todos os produtos">
                                    {products
                                      .filter((p) => p.is_active)
                                      .slice(0, 50)
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
                        </div>
                      )}

                      {/* No suggestion - show normal dropdown */}
                      {!hasSuggestion && !item.criarProduto && !mappedProduct && !suggestion?.loading && (
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
                              Vincular...
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
