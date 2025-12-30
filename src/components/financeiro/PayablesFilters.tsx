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
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
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

export function PayablesFilters({
  filters,
  onFiltersChange,
  showCategoryFilter = true,
}: PayablesFiltersProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

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
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 h-10 bg-background"
          />
        </div>

        {/* Supplier Filter */}
        <Select
          value={filters.supplierId}
          onValueChange={(value) => onFiltersChange({ ...filters, supplierId: value })}
        >
          <SelectTrigger className="w-[180px] h-10 bg-background">
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
            <SelectTrigger className="w-[160px] h-10 bg-background">
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

        {/* Month Navigator */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant={isCurrentMonth ? "secondary" : "ghost"}
            onClick={handleCurrentMonth}
            className="min-w-[140px] font-semibold capitalize h-9"
          >
            {format(filters.currentMonth, "MMMM yyyy", { locale: ptBR })}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground h-9"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}