import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectWithCreateProps<T> {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  items: T[];
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemSubLabel?: (item: T) => string | null;
  onCreateNew: () => void;
  createNewLabel?: string;
  showSearch?: boolean;
  searchFilter?: (item: T, search: string) => boolean;
  disabled?: boolean;
  className?: string;
  maxDisplayItems?: number;
}

export function SelectWithCreate<T>({
  value,
  onValueChange,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  items,
  getItemValue,
  getItemLabel,
  getItemSubLabel,
  onCreateNew,
  createNewLabel = "Cadastrar novo",
  showSearch = true,
  searchFilter,
  disabled = false,
  className,
  maxDisplayItems = 30,
}: SelectWithCreateProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = search && searchFilter
    ? items.filter(item => searchFilter(item, search))
    : items;

  const displayItems = filteredItems.slice(0, maxDisplayItems);

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCreateNew();
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[200]">
        {/* Botão de cadastro no topo */}
        <div className="p-2 border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-primary hover:text-primary"
            onClick={handleCreateClick}
          >
            <Plus className="h-4 w-4" />
            {createNewLabel}
          </Button>
        </div>

        {/* Campo de busca */}
        {showSearch && (
          <div className="p-2 border-b">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 h-8"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredItems.length} item(s) encontrado(s)
            </p>
          </div>
        )}

        {/* Lista de itens */}
        {displayItems.map((item) => {
          const itemValue = getItemValue(item);
          const itemLabel = getItemLabel(item);
          const itemSubLabel = getItemSubLabel?.(item);

          return (
            <SelectItem key={itemValue} value={itemValue}>
              <span>{itemLabel}</span>
              {itemSubLabel && (
                <span className="text-muted-foreground ml-1">({itemSubLabel})</span>
              )}
            </SelectItem>
          );
        })}

        {displayItems.length === 0 && (
          <div className="p-2 text-center text-sm text-muted-foreground">
            Nenhum item encontrado
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
