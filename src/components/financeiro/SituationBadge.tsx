import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SituationBadgeProps {
  name: string;
  color: string;
  confirmsPayment?: boolean;
  className?: string;
}

export function SituationBadge({ name, color, confirmsPayment, className }: SituationBadgeProps) {
  // Converter cor hex para estilos
  const getColorStyles = (hexColor: string) => {
    // Usar a cor como background com opacidade e texto
    return {
      backgroundColor: `${hexColor}20`, // 20 = ~12% opacidade
      borderColor: `${hexColor}40`,
      color: hexColor,
    };
  };

  const styles = getColorStyles(color);

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", className)}
      style={styles}
    >
      {confirmsPayment && (
        <span className="mr-1">✓</span>
      )}
      {name}
    </Badge>
  );
}
