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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, ChevronsUpDown, Plus, Package, Info, Lightbulb, Loader2, X, AlertTriangle, Link } from "lucide-react";
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
  autoLinked?: boolean;
}

interface ItensNFeTableProps {
  itens: NFEItem[];
  products: Product[];
  onMapProduct: (itemIndex: number, productId: string) => void;
  onCriarProduto: (itemIndex: number) => void;
  onToggleCriarProduto: (itemIndex: number, criar: boolean) => void;
  onCfopEntradaChange: (itemIndex: number, cfop: string) => void;
  onValidationChange?: (allValid: boolean, pendingCount: number) => void;
}

export function ItensNFeTable({
  itens,
  products,
  onMapProduct,
  onCriarProduto,
  onToggleCriarProduto,
  onCfopEntradaChange,
  onValidationChange,
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

      const matches = data?.matches || [];
      const bestMatch = matches[0];
      
      // Auto-link if score is 100%
      if (bestMatch && bestMatch.score === 100) {
        onMapProduct(itemIndex, bestMatch.id);
        setSuggestions(prev => ({
          ...prev,
          [itemIndex]: { 
            matches, 
            loading: false, 
            searched: true,
            autoLinked: true
          }
        }));
      } else {
        setSuggestions(prev => ({
          ...prev,
          [itemIndex]: { 
            matches, 
            loading: false, 
            searched: true,
            autoLinked: false
          }
        }));
      }
    } catch (error) {
      console.error('Error searching product matches:', error);
      setSuggestions(prev => ({
        ...prev,
        [itemIndex]: { matches: [], loading: false, searched: true, autoLinked: false }
      }));
    }
  }, [onMapProduct]);

  // Search for all items when component mounts or items change
  useEffect(() => {
    itens.forEach((item, index) => {
      // Only search if not already searched and no product mapped
      if (!suggestions[index]?.searched && !item.productId && !item.criarProduto) {
        searchProductMatches(index, item);
      }
    });
  }, [itens, searchProductMatches]);

  // Calculate validation status and notify parent
  useEffect(() => {
    if (!onValidationChange) return;

    const pendingItems = itens.filter((item, index) => {
      const hasProduct = !!item.productId;
      const willCreate = !!item.criarProduto;
      return !hasProduct && !willCreate;
    });

    const allValid = pendingItems.length === 0;
    onValidationChange(allValid, pendingItems.length);
  }, [itens, onValidationChange]);

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
      [itemIndex]: { matches: [], loading: false, searched: true, autoLinked: false }
    }));
  };

  const getMatchTypeLabel = (matchType: string): string => {
    switch (matchType) {
      case 'exact_code': return 'Código exato';
      case 'normalized_code': return 'Código similar';
      case 'description_similarity': return 'Descrição similar';
      default: return 'Sugestão';
    }
  };

  // Determine row status for each item
  const getRowStatus = (item: NFEItem, index: number): 'green' | 'yellow' | 'red' | 'loading' => {
    const suggestion = suggestions[index];
    
    // Still loading
    if (suggestion?.loading) return 'loading';
    
    // Already mapped or marked to create
    if (item.productId) return 'green';
    if (item.criarProduto) return 'green';
    
    // Has suggestion with score >= 70
    const bestMatch = suggestion?.matches?.[0];
    if (bestMatch && bestMatch.score >= 70 && bestMatch.score < 100) return 'yellow';
    
    // No product linked
    return 'red';
  };

  const getRowClassName = (status: 'green' | 'yellow' | 'red' | 'loading') => {
    switch (status) {
      case 'green':
        return 'bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500';
      case 'yellow':
        return 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-l-amber-500';
      case 'red':
        return 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500';
      case 'loading':
        return 'opacity-70';
      default:
        return '';
    }
  };

  // Count items by status
  const statusCounts = itens.reduce((acc, item, index) => {
    const status = getRowStatus(item, index);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Itens da Nota ({itens.length})
        </CardTitle>
        
        {/* Status summary */}
        <div className="flex flex-wrap gap-2 mt-2">
          {statusCounts.green > 0 && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400">
              <Check className="h-3 w-3 mr-1" />
              {statusCounts.green} vinculado(s)
            </Badge>
          )}
          {statusCounts.yellow > 0 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400">
              <Lightbulb className="h-3 w-3 mr-1" />
              {statusCounts.yellow} com sugestão
            </Badge>
          )}
          {statusCounts.red > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {statusCounts.red} sem vínculo
            </Badge>
          )}
          {statusCounts.loading > 0 && (
            <Badge variant="outline">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {statusCounts.loading} buscando...
            </Badge>
          )}
        </div>
      </CardHeader>
      
      {/* Alert for items without product */}
      {statusCounts.red > 0 && (
        <div className="px-6 pb-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{statusCounts.red} produto(s) não cadastrado(s).</strong> Vincule a um produto existente ou marque "Auto Cadastrar" para cada item em vermelho antes de finalizar.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
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
                <TableHead className="w-72">Produto</TableHead>
                <TableHead className="w-28 text-center">Auto Cadastrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => {
                const ncmValidation = validateNCM(item.ncm);
                const mappedProduct = products.find((p) => p.id === item.productId);
                const suggestion = suggestions[index];
                const bestMatch = suggestion?.matches?.[0];
                const rowStatus = getRowStatus(item, index);
                const wasAutoLinked = suggestion?.autoLinked && item.productId;

                return (
                  <TableRow key={index} className={getRowClassName(rowStatus)}>
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
                          Buscando produtos...
                        </div>
                      )}

                      {/* Already marked to create - GREEN */}
                      {item.criarProduto && !suggestion?.loading && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400">
                            <Plus className="h-3 w-3 mr-1" />
                            Será cadastrado
                          </Badge>
                        </div>
                      )}

                      {/* Already mapped - GREEN (with auto-link info if applicable) */}
                      {mappedProduct && !item.criarProduto && !suggestion?.loading && (
                        <div className="space-y-1">
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400">
                            <Link className="h-3 w-3 mr-1" />
                            {mappedProduct.code}
                          </Badge>
                          {wasAutoLinked && (
                            <p className="text-[10px] text-green-600 dark:text-green-400">
                              ✓ Vinculado automaticamente (100% match)
                            </p>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[180px] cursor-help">
                                {mappedProduct.description}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>{mappedProduct.description}</TooltipContent>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] text-muted-foreground p-0"
                            onClick={() => onMapProduct(index, '')}
                          >
                            Alterar vinculação
                          </Button>
                        </div>
                      )}

                      {/* Suggestion available (score >= 70 but < 100) - YELLOW */}
                      {rowStatus === 'yellow' && bestMatch && !item.criarProduto && !mappedProduct && !suggestion?.loading && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 cursor-pointer flex-1 min-w-0">
                                  <Lightbulb className="h-3 w-3 text-amber-600 flex-shrink-0" />
                                  <span className="text-xs truncate font-medium">
                                    {bestMatch.code}
                                  </span>
                                  <Badge 
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1 flex-shrink-0 bg-amber-200 text-amber-800"
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
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleAcceptSuggestion(index, bestMatch.id)}
                              title="Aceitar sugestão"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => handleRejectSuggestion(index)}
                              title="Recusar sugestão"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Confirme ou recuse a sugestão
                          </p>
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

                      {/* No product - RED */}
                      {rowStatus === 'red' && !item.criarProduto && !mappedProduct && !suggestion?.loading && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 p-1.5 rounded-md bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
                            <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                            <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                              Produto não cadastrado
                            </span>
                          </div>
                          <Popover
                            open={openPopover === index}
                            onOpenChange={(open) => setOpenPopover(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-between text-xs border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Vincular produto...
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
                          <p className="text-[10px] text-red-600 dark:text-red-400">
                            Vincule ou marque "Auto Cadastrar"
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.criarProduto || false}
                        onCheckedChange={(checked) =>
                          onToggleCriarProduto(index, checked as boolean)
                        }
                        disabled={!!item.productId}
                        className={rowStatus === 'red' && !item.productId ? 'border-red-500' : ''}
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
