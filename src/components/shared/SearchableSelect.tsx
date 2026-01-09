import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onCreateNew?: () => void;
  createNewLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  onCreateNew,
  createNewLabel = "Cadastrar novo",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  // Custom filter that matches any word in the search term
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    
    const searchLower = search.toLowerCase().trim();
    const searchWords = searchLower.split(/\s+/).filter(Boolean);
    
    return options.filter((option) => {
      const label = (option.label || "").toLowerCase();
      const sublabel = (option.sublabel || "").toLowerCase();
      const combined = `${label} ${sublabel}`;
      
      // Match if ALL words in search are found anywhere in label or sublabel
      return searchWords.every(word => combined.includes(word));
    });
  }, [options, search]);

  const displayOptions = filteredOptions.slice(0, 100);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          {selectedOption ? (
            <span className="truncate text-left flex-1">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-muted-foreground ml-2 text-xs">
                  {selectedOption.sublabel}
                </span>
              )}
            </span>
          ) : (
            <span className="truncate text-left flex-1">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          {/* Custom search input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          <ScrollArea className="max-h-[300px]">
            {displayOptions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                {onCreateNew && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCreateNew();
                      setOpen(false);
                    }}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createNewLabel}
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-1">
                {onCreateNew && (
                  <div
                    onClick={() => {
                      onCreateNew();
                      setOpen(false);
                    }}
                    className="flex items-center px-2 py-1.5 text-sm text-primary cursor-pointer hover:bg-accent rounded-sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createNewLabel}
                  </div>
                )}
                {displayOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-xs text-muted-foreground truncate">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredOptions.length > 100 && (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    Mostrando 100 de {filteredOptions.length}. Digite mais para filtrar.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
