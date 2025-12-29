import { Badge } from "@/components/ui/badge";

interface SaleStatusBadgeProps {
  name: string;
  color: string;
}

export function SaleStatusBadge({ name, color }: SaleStatusBadgeProps) {
  return (
    <Badge
      style={{ 
        backgroundColor: color,
        color: '#fff'
      }}
      className="font-medium"
    >
      {name}
    </Badge>
  );
}
