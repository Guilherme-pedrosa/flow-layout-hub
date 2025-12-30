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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ChevronLeft, ChevronRight, Plus, MoreHorizontal, Calendar, X, Download, Printer } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

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
  onAddNew: () => void;
}

export function PayablesFilters({
  filters,
  onFiltersChange,
  onAddNew,
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

  const handleClearFilters = () => {
    onFiltersChange({
      search: "",
      supplierId: "",
      category: "",
      paymentMethod: "",
      currentMonth: new Date(),
    });
  };

  const hasActiveFilters = filters.search || filters.supplierId || filters.category || filters.paymentMethod;

  return (
    <div className="space-y-4">
      {/* Filter Bar - Clean card style */}
      <div className="filter-bar">
        {/* Month Navigator */}
        <div className="flex items-center gap-1 border-r border-border pr-4 mr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[140px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium capitalize">
              {format(filters.currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Supplier Filter */}
        <Select 
          value={filters.supplierId || "all"} 
          onValueChange={(value) => onFiltersChange({ ...filters, supplierId: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-[180px] bg-card border-border h-9">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.nome_fantasia || supplier.razao_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Payment Method Filter */}
        <Select 
          value={filters.paymentMethod || "all"} 
          onValueChange={(value) => onFiltersChange({ ...filters, paymentMethod: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-[140px] bg-card border-border h-9">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="boleto">Boleto</SelectItem>
            <SelectItem value="transfer">Transferência</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição, fornecedor..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 bg-card border-border h-9"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Mais ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add New Button */}
        <Button onClick={onAddNew} className="h-9 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Conta</span>
        </Button>
      </div>
    </div>
  );
}
