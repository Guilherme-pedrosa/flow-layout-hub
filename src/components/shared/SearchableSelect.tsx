import { useState } from "react";
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
  const filteredOptions = options.filter((option) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const label = option.label?.toLowerCase() || "";
    const sublabel = option.sublabel?.toLowerCase() || "";
    const combined = `${label} ${sublabel}`;
    
    // Match if any word in search is found anywhere in label or sublabel
    const searchWords = searchLower.split(/\s+/).filter(Boolean);
    return searchWords.every(word => combined.includes(word));
  });

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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {filteredOptions.length === 0 && (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4">
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
              </CommandEmpty>
            )}
            {onCreateNew && filteredOptions.length > 0 && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateNew();
                    setOpen(false);
                  }}
                  className="text-primary cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createNewLabel}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {filteredOptions.slice(0, 100).map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
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
                </CommandItem>
              ))}
              {filteredOptions.length > 100 && (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  Mostrando 100 de {filteredOptions.length}. Digite mais para filtrar.
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
