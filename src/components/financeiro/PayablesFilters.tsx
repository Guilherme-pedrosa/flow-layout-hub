import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Settings2, X, CalendarDays } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
}

export interface PayablesFiltersState {
  search: string;
  supplierId: string;
  category: string;
  paymentMethod: string;
  currentMonth: Date;
}

interface PayablesFiltersProps {
  filters: PayablesFiltersState;
  onFiltersChange: (filters: PayablesFiltersState) => void;
  showCategoryFilter?: boolean;
}

const CATEGORIES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "impostos", label: "Impostos" },
  { value: "folha", label: "Folha de Pagamento" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "servicos", label: "Serviços" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "marketing", label: "Marketing" },
  { value: "outros", label: "Outros" },
];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

export function PayablesFilters({
  filters,
  onFiltersChange,
  showCategoryFilter = true,
}: PayablesFiltersProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    supplier: true,
    category: true,
    dueDate: true,
    amount: true,
    status: true,
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from("pessoas")
        .select("id, nome_fantasia, razao_social")
        .eq("is_fornecedor", true)
        .eq("is_active", true)
        .order("nome_fantasia");
      
      if (data) setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  const handlePreviousMonth = () => {
    onFiltersChange({
      ...filters,
      currentMonth: subMonths(filters.currentMonth, 1),
    });
  };

  const handleNextMonth = () => {
    onFiltersChange({
      ...filters,
      currentMonth: addMonths(filters.currentMonth, 1),
    });
  };

  const handleCurrentMonth = () => {
    onFiltersChange({
      ...filters,
      currentMonth: startOfMonth(new Date()),
    });
  };

  const hasActiveFilters = 
    filters.search !== "" || 
    filters.supplierId !== "all" || 
    filters.category !== "all" ||
    filters.paymentMethod !== "all";

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      search: "",
      supplierId: "all",
      category: "all",
      paymentMethod: "all",
    });
  };

  const isCurrentMonth = format(filters.currentMonth, "MM-yyyy") === format(new Date(), "MM-yyyy");

  return (
    <div className="space-y-4">
      {/* Month Navigator - Layout profissional */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-9 w-9 hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant={isCurrentMonth ? "secondary" : "ghost"}
            onClick={handleCurrentMonth}
            className={cn(
              "min-w-[180px] font-bold text-base capitalize h-9",
              isCurrentMonth && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {format(filters.currentMonth, "MMMM yyyy", { locale: ptBR })}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-9 w-9 hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Filters Row - Layout profissional */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px] max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, fornecedor ou valor..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 h-10 bg-background border-input"
          />
        </div>

        {/* Supplier Filter */}
        <Select
          value={filters.supplierId}
          onValueChange={(value) => onFiltersChange({ ...filters, supplierId: value })}
        >
          <SelectTrigger className={cn(
            "w-[200px] h-10 bg-background",
            filters.supplierId !== "all" && "border-primary"
          )}>
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Fornecedores</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.nome_fantasia || supplier.razao_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        {showCategoryFilter && (
          <Select
            value={filters.category}
            onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
          >
            <SelectTrigger className={cn(
              "w-[170px] h-10 bg-background",
              filters.category !== "all" && "border-primary"
            )}>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Payment Method Filter */}
        <Select
          value={filters.paymentMethod}
          onValueChange={(value) => onFiltersChange({ ...filters, paymentMethod: value })}
        >
          <SelectTrigger className={cn(
            "w-[150px] h-10 bg-background",
            filters.paymentMethod !== "all" && "border-primary"
          )}>
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Métodos</SelectItem>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Settings - Column Visibility */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-background">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Colunas Visíveis</h4>
                <p className="text-xs text-muted-foreground">
                  Personalize as colunas exibidas na tabela.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { key: "description", label: "Descrição" },
                  { key: "supplier", label: "Fornecedor" },
                  { key: "category", label: "Categoria" },
                  { key: "dueDate", label: "Vencimento" },
                  { key: "amount", label: "Valor" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  <div key={col.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={col.key}
                      checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col.key]: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor={col.key} className="text-sm cursor-pointer">
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
