/**
 * AIContextStatus - Badge de status do contexto da IA
 * 
 * Mostra ao usuário:
 * - Empresa carregada
 * - Rota/página atual
 * - Entidade selecionada (se houver)
 * - Fonte dos dados consultados
 */
import { Database, Building2, MapPin, Package, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AIContextStatusProps {
  companyName?: string;
  currentRoute?: string;
  entityType?: string;
  entityName?: string;
  dataSources?: string[];
  lastUpdated?: Date;
  className?: string;
}

export function AIContextStatus({
  companyName,
  currentRoute,
  entityType,
  entityName,
  dataSources = [],
  lastUpdated,
  className
}: AIContextStatusProps) {
  const getRouteLabel = (route: string) => {
    const routeMap: Record<string, string> = {
      "/contas-pagar": "Contas a Pagar",
      "/contas-receber": "Contas a Receber",
      "/estoque/saldo": "Estoque",
      "/ordens-servico": "Ordens de Serviço",
      "/vendas": "Vendas",
      "/clientes": "Clientes",
      "/fornecedores": "Fornecedores",
      "/produtos": "Produtos",
      "/dashboard": "Dashboard",
      "/financeiro": "Financeiro",
    };
    return routeMap[route] || route;
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50", className)}>
      {/* Empresa */}
      {companyName && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                <Building2 className="h-3 w-3" />
                {companyName.length > 15 ? companyName.slice(0, 15) + "..." : companyName}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Empresa: {companyName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Rota atual */}
      {currentRoute && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <MapPin className="h-3 w-3" />
                {getRouteLabel(currentRoute)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Página atual: {currentRoute}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Entidade selecionada */}
      {entityType && entityName && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-xs font-normal bg-primary/10">
                <Package className="h-3 w-3" />
                {entityName.length > 12 ? entityName.slice(0, 12) + "..." : entityName}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{entityType}: {entityName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Fonte dos dados */}
      {dataSources.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
                <Database className="h-3 w-3" />
                {dataSources.length} tabelas
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold mb-1">Dados consultados:</p>
              <ul className="text-xs space-y-0.5">
                {dataSources.map((source, i) => (
                  <li key={i}>• {source}</li>
                ))}
              </ul>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-2">
                  Atualizado: {lastUpdated.toLocaleTimeString("pt-BR")}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * Extrai as fontes de dados do contexto serializado
 */
export function extractDataSources(contextText: string): string[] {
  const sources: string[] = [];
  
  if (contextText.includes("Contas a Pagar")) sources.push("payables");
  if (contextText.includes("Contas a Receber")) sources.push("accounts_receivable");
  if (contextText.includes("Saldo Bancário")) sources.push("bank_accounts");
  if (contextText.includes("Transações")) sources.push("bank_transactions");
  if (contextText.includes("Estoque")) sources.push("products");
  if (contextText.includes("Ordens de Serviço")) sources.push("service_orders");
  if (contextText.includes("Vendas")) sources.push("sales");
  if (contextText.includes("Clientes")) sources.push("clientes");
  if (contextText.includes("Fornecedores")) sources.push("pessoas");
  
  return sources;
}
