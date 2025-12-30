import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CFOPS_ENTRADA_ESTADUAL, 
  CFOPS_ENTRADA_INTERESTADUAL, 
  CFOPS_ENTRADA_EXTERIOR,
  CFOPOption 
} from "@/lib/cfops";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CFOPSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  supplierState?: string | null; // UF do fornecedor
  companyState?: string | null; // UF da empresa
  purpose?: string; // Finalidade: estoque, ordem_de_servico, despesa_operacional
  productDescription?: string; // Descrição do produto/serviço
}

export function CFOPSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione o CFOP...",
  supplierState,
  companyState,
  purpose,
  productDescription
}: CFOPSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestingAI, setSuggestingAI] = useState(false);

  // Determina o tipo de operação baseado nas UFs
  const operationType = useMemo(() => {
    if (!supplierState || !companyState) return "all";
    
    const supplierUF = supplierState.toUpperCase();
    const companyUF = companyState.toUpperCase();
    
    // Se a UF é de fora do Brasil (não reconhecida)
    const brazilianStates = [
      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
      "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
      "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];
    
    if (!brazilianStates.includes(supplierUF)) {
      return "exterior"; // 3xxx
    }
    
    if (supplierUF === companyUF) {
      return "estadual"; // 1xxx
    }
    
    return "interestadual"; // 2xxx
  }, [supplierState, companyState]);

  // Filtra CFOPs baseado na UF
  const availableCFOPs = useMemo(() => {
    if (operationType === "estadual") {
      return CFOPS_ENTRADA_ESTADUAL.map(c => ({ ...c, tipo: "Estadual (1xxx)" }));
    }
    if (operationType === "interestadual") {
      return CFOPS_ENTRADA_INTERESTADUAL.map(c => ({ ...c, tipo: "Interestadual (2xxx)" }));
    }
    if (operationType === "exterior") {
      return CFOPS_ENTRADA_EXTERIOR.map(c => ({ ...c, tipo: "Importação (3xxx)" }));
    }
    // Se não tem UF definida, mostra todos
    return [
      ...CFOPS_ENTRADA_ESTADUAL.map(c => ({ ...c, tipo: "Estadual (1xxx)" })),
      ...CFOPS_ENTRADA_INTERESTADUAL.map(c => ({ ...c, tipo: "Interestadual (2xxx)" })),
      ...CFOPS_ENTRADA_EXTERIOR.map(c => ({ ...c, tipo: "Importação (3xxx)" })),
    ];
  }, [operationType]);

  const filteredCFOPs = useMemo(() => {
    if (!search) return availableCFOPs;
    const searchLower = search.toLowerCase();
    return availableCFOPs.filter(cfop => 
      cfop.codigo.includes(search) || 
      cfop.descricao.toLowerCase().includes(searchLower) ||
      cfop.grupo.toLowerCase().includes(searchLower)
    );
  }, [availableCFOPs, search]);

  const groupedCFOPs = useMemo(() => {
    const groups: Record<string, typeof filteredCFOPs> = {};
    filteredCFOPs.forEach(cfop => {
      if (!groups[cfop.tipo]) {
        groups[cfop.tipo] = [];
      }
      groups[cfop.tipo].push(cfop);
    });
    return groups;
  }, [filteredCFOPs]);

  const selectedCFOP = availableCFOPs.find(c => c.codigo === value);

  // Sugestão de CFOP via IA
  const handleAISuggestion = async () => {
    if (!supplierState || !companyState) {
      toast.error("Selecione um fornecedor primeiro para que a IA possa sugerir o CFOP");
      return;
    }

    setSuggestingAI(true);
    try {
      const prompt = `Você é um especialista em CFOP (Código Fiscal de Operações e Prestações) brasileiro.

Contexto da operação:
- UF do Fornecedor: ${supplierState}
- UF da Empresa (destinatário): ${companyState}
- Finalidade: ${purpose === 'estoque' ? 'Compra para revenda/comercialização' : purpose === 'ordem_de_servico' ? 'Uso em ordem de serviço' : 'Despesa operacional/uso e consumo'}
${productDescription ? `- Descrição: ${productDescription}` : ''}

Tipo de operação: ${operationType === 'estadual' ? 'Estadual (mesma UF) - CFOPs 1xxx' : operationType === 'interestadual' ? 'Interestadual (UFs diferentes) - CFOPs 2xxx' : 'Importação - CFOPs 3xxx'}

Sugira o CFOP mais adequado. Responda APENAS com o código de 4 dígitos, sem explicação.`;

      const { data, error } = await supabase.functions.invoke('financial-ai', {
        body: { 
          prompt,
          type: 'cfop_suggestion'
        }
      });

      if (error) throw error;

      const suggestedCFOP = data?.response?.match(/\d{4}/)?.[0];
      
      if (suggestedCFOP) {
        // Verificar se o CFOP existe na lista disponível
        const exists = availableCFOPs.find(c => c.codigo === suggestedCFOP);
        if (exists) {
          onValueChange(suggestedCFOP);
          toast.success(`IA sugeriu: ${suggestedCFOP} - ${exists.descricao}`);
        } else {
          toast.warning(`CFOP ${suggestedCFOP} sugerido, mas não está disponível para este tipo de operação`);
        }
      } else {
        toast.error("Não foi possível obter sugestão de CFOP");
      }
    } catch (error) {
      console.error("Erro ao sugerir CFOP:", error);
      toast.error("Erro ao consultar IA para sugestão de CFOP");
    } finally {
      setSuggestingAI(false);
    }
  };

  // Mensagem sobre restrição de UF
  const restrictionMessage = useMemo(() => {
    if (operationType === "estadual") {
      return `Fornecedor de ${supplierState} (mesma UF) - apenas CFOPs 1xxx`;
    }
    if (operationType === "interestadual") {
      return `Fornecedor de ${supplierState} (outra UF) - apenas CFOPs 2xxx`;
    }
    if (operationType === "exterior") {
      return `Fornecedor estrangeiro - apenas CFOPs 3xxx`;
    }
    return null;
  }, [operationType, supplierState]);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal"
          >
            {selectedCFOP ? (
              <span className="truncate">
                {selectedCFOP.codigo} - {selectedCFOP.descricao}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Pesquisar por código ou descrição..." 
              value={search}
              onValueChange={setSearch}
            />
            {restrictionMessage && (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b">
                ℹ️ {restrictionMessage}
              </div>
            )}
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Nenhum CFOP encontrado.</CommandEmpty>
              {Object.entries(groupedCFOPs).map(([tipo, cfops]) => (
                <CommandGroup key={tipo} heading={tipo}>
                  {cfops.map((cfop) => (
                    <CommandItem
                      key={cfop.codigo}
                      value={cfop.codigo}
                      onSelect={() => {
                        onValueChange(cfop.codigo);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === cfop.codigo ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-primary">{cfop.codigo}</span>
                        <span className="mx-1">-</span>
                        <span className="text-sm">{cfop.descricao}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({cfop.grupo})</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAISuggestion}
              disabled={suggestingAI}
              className="shrink-0"
            >
              {suggestingAI ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sugerir CFOP com IA</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
