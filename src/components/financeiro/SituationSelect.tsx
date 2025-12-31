import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

interface FinancialSituation {
  id: string;
  name: string;
  color: string;
  allows_manual_change: boolean;
  confirms_payment: boolean;
  is_active: boolean;
}

interface SituationSelectProps {
  value: string | null;
  onValueChange: (situationId: string) => void;
  disabled?: boolean;
  className?: string;
  showAllSituations?: boolean; // Se true, mostra todas incluindo as que não permitem mudança manual
}

export function SituationSelect({
  value,
  onValueChange,
  disabled,
  className,
  showAllSituations = false,
}: SituationSelectProps) {
  const { currentCompany } = useCompany();
  const [situations, setSituations] = useState<FinancialSituation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchSituations = async () => {
      if (!currentCompany?.id) return;

      try {
        const { data, error } = await supabase
          .from("financial_situations")
          .select("id, name, color, allows_manual_change, confirms_payment, is_active, is_default")
          .eq("company_id", currentCompany.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        const situationsData = (data as (FinancialSituation & { is_default?: boolean })[]) || [];
        setSituations(situationsData);
        
        // Se não tem valor selecionado, aplicar a situação padrão automaticamente
        if (!value && situationsData.length > 0) {
          const defaultSituation = situationsData.find(s => s.is_default);
          if (defaultSituation) {
            onValueChange(defaultSituation.id);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar situações:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSituations();
  }, [currentCompany?.id, value, onValueChange]);

  // Filtrar situações baseado em allows_manual_change
  const selectableSituations = showAllSituations
    ? situations
    : situations.filter((s) => s.allows_manual_change);

  // Encontrar situação atual
  const currentSituation = situations.find((s) => s.id === value);

  const handleChange = async (newValue: string) => {
    const situation = situations.find((s) => s.id === newValue);
    
    // Verificar se a situação permite mudança manual
    if (situation && !situation.allows_manual_change) {
      toast.error("Esta situação só pode ser atribuída automaticamente pelo sistema");
      return;
    }

    setUpdating(true);
    try {
      onValueChange(newValue);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando...
      </div>
    );
  }

  // Se a situação atual não permite mudança manual e não estamos mostrando todas,
  // exibir apenas o badge
  if (currentSituation && !currentSituation.allows_manual_change && !showAllSituations) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium border cursor-not-allowed opacity-80",
          className
        )}
        style={{
          backgroundColor: `${currentSituation.color}20`,
          borderColor: `${currentSituation.color}40`,
          color: currentSituation.color,
        }}
        title="Esta situação só pode ser alterada pelo sistema"
      >
        {currentSituation.confirms_payment && <span>✓</span>}
        {currentSituation.name}
      </div>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={handleChange}
      disabled={disabled || updating}
    >
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue placeholder="Selecione situação">
          {currentSituation && (
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: currentSituation.color }}
              />
              <span className="truncate">{currentSituation.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {selectableSituations.map((situation) => (
          <SelectItem 
            key={situation.id} 
            value={situation.id}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: situation.color }}
              />
              <span>{situation.name}</span>
              {situation.confirms_payment && (
                <span className="text-xs text-muted-foreground">(confirma pgto)</span>
              )}
            </div>
          </SelectItem>
        ))}
        {selectableSituations.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nenhuma situação disponível
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
