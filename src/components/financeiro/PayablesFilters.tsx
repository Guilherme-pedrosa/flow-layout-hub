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
import { Search, ChevronDown, Plus, Settings, Calendar, Filter } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
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

  return (
    <div className="space-y-4">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-2">
        {/* Add Button */}
        <Button onClick={onAddNew} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700 gap-2">
              <Settings className="h-4 w-4" />
              Mais ações
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Exportar Excel</DropdownMenuItem>
            <DropdownMenuItem>Exportar PDF</DropdownMenuItem>
            <DropdownMenuItem>Imprimir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Month Selector */}
        <div className="flex items-center">
          <Button
            variant="outline"
            className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700 rounded-r-none border-r-0 gap-2"
            onClick={() => {}}
          >
            <Calendar className="h-4 w-4" />
            {format(filters.currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700 rounded-l-none"
            onClick={handlePreviousMonth}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Advanced Search */}
        <Button variant="outline" className="bg-green-600 hover:bg-green-700 text-white border-green-600 gap-2">
          <Search className="h-4 w-4" />
          Busca avançada
        </Button>
      </div>
    </div>
  );
}