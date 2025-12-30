import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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
  CFOPS_ENTRADA_ESTADUAL, 
  CFOPS_ENTRADA_INTERESTADUAL, 
  CFOPS_ENTRADA_EXTERIOR,
  CFOPOption 
} from "@/lib/cfops";

interface CFOPSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function CFOPSelect({ value, onValueChange, placeholder = "Selecione o CFOP..." }: CFOPSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allCFOPs = useMemo(() => [
    ...CFOPS_ENTRADA_ESTADUAL.map(c => ({ ...c, tipo: "Estadual (1xxx)" })),
    ...CFOPS_ENTRADA_INTERESTADUAL.map(c => ({ ...c, tipo: "Interestadual (2xxx)" })),
    ...CFOPS_ENTRADA_EXTERIOR.map(c => ({ ...c, tipo: "Importação (3xxx)" })),
  ], []);

  const filteredCFOPs = useMemo(() => {
    if (!search) return allCFOPs;
    const searchLower = search.toLowerCase();
    return allCFOPs.filter(cfop => 
      cfop.codigo.includes(search) || 
      cfop.descricao.toLowerCase().includes(searchLower) ||
      cfop.grupo.toLowerCase().includes(searchLower)
    );
  }, [allCFOPs, search]);

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

  const selectedCFOP = allCFOPs.find(c => c.codigo === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
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
  );
}
