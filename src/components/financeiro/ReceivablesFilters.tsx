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
import { SearchableSelect } from "@/components/shared/SearchableSelect";
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
import { useFinancialSituations } from "@/hooks/useFinancialSituations";

interface Client {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
}

export interface ReceivablesFiltersState {
  search: string;
  clientId: string;
  situationId: string;
  currentMonth: Date;
}

interface ReceivablesFiltersProps {
  filters: ReceivablesFiltersState;
  onFiltersChange: (filters: ReceivablesFiltersState) => void;
  onAddNew: () => void;
}

export function ReceivablesFilters({
  filters,
  onFiltersChange,
  onAddNew,
}: ReceivablesFiltersProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const { situations } = useFinancialSituations();

  useEffect(() => {
    const fetchClients = async () => {
      // Usar tabela unificada pessoas com filtro is_cliente
      const { data } = await supabase
        .from("pessoas")
        .select("id, nome_fantasia, razao_social")
        .eq("is_cliente", true)
        .eq("is_active", true)
        .order("nome_fantasia");
      
      if (data) setClients(data);
    };
    fetchClients();
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
      clientId: "",
      situationId: "",
      currentMonth: new Date(),
    });
  };

  const hasActiveFilters = filters.search || filters.clientId || filters.situationId;

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

        {/* Client Filter */}
        <SearchableSelect
          options={[
            { value: "all", label: "Todos os clientes" },
            ...clients.map((client) => ({
              value: client.id,
              label: client.nome_fantasia || client.razao_social || "Sem nome"
            }))
          ]}
          value={filters.clientId || "all"}
          onChange={(value) => onFiltersChange({ ...filters, clientId: value === "all" ? "" : value })}
          placeholder="Cliente"
          searchPlaceholder="Buscar cliente..."
          emptyMessage="Nenhum cliente encontrado"
          className="w-[180px]"
        />

        {/* Situation Filter */}
        <Select 
          value={filters.situationId || "all"} 
          onValueChange={(value) => onFiltersChange({ ...filters, situationId: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-[160px] bg-card border-border h-9">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas situações</SelectItem>
            {situations.filter(s => s.is_active).map((situation) => (
              <SelectItem key={situation.id} value={situation.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: situation.color }}
                  />
                  {situation.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição, cliente..."
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
