import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  type: "venda" | "recebimento" | "pagamento" | "estoque" | "os";
  description: string;
  value?: number;
  timestamp: Date;
  user: string;
}

const activityTypeLabels = {
  venda: { label: "Venda", variant: "default" as const },
  recebimento: { label: "Recebimento", variant: "default" as const },
  pagamento: { label: "Pagamento", variant: "secondary" as const },
  estoque: { label: "Estoque", variant: "outline" as const },
  os: { label: "OS", variant: "secondary" as const },
};

interface RecentActivitiesProps {
  activities: Activity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="text-right">Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <Badge variant={activityTypeLabels[activity.type].variant}>
                    {activityTypeLabels[activity.type].label}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{activity.description}</TableCell>
                <TableCell>
                  {activity.value ? formatCurrency(activity.value) : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">{activity.user}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
