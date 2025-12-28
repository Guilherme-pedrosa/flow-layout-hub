import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileText, User, Building2, Settings } from "lucide-react";
import { useAuditLogs, AuditLog } from "@/hooks/useConfiguracoes";
import { formatDate } from "@/lib/formatters";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Criação", color: "bg-success/20 text-success border-success/30" },
  update: { label: "Alteração", color: "bg-info/20 text-info border-info/30" },
  delete: { label: "Exclusão", color: "bg-destructive/20 text-destructive border-destructive/30" },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

export function LogsList() {
  const { loading, fetchLogs } = useAuditLogs();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const data = await fetchLogs();
    setLogs(data);
  };

  const filteredLogs = logs.filter((log) => {
    const searchLower = search.toLowerCase();
    const userName = (log as any).users?.name || "";
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.entity.toLowerCase().includes(searchLower) ||
      userName.toLowerCase().includes(searchLower)
    );
  });

  const getActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || { label: action, color: "bg-muted" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getEntityIcon = (entity: string) => {
    return ENTITY_ICONS[entity] || <FileText className="h-4 w-4" />;
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata || Object.keys(metadata).length === 0) return "-";
    
    const entries = Object.entries(metadata).slice(0, 3);
    return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
  };

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ação, entidade ou usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "Nenhum log encontrado" : "Nenhum log registrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {getEntityIcon(log.entity)}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="font-medium capitalize">
                      {log.entity}
                    </TableCell>
                    <TableCell>
                      {(log as any).users?.name || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {formatMetadata(log.metadata_json)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
