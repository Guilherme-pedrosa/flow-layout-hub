import { Search, User, LogOut, Settings, ChevronDown, Menu, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CompanySelector } from "./CompanySelector";
import { AINotificationsDropdown } from "./AINotificationsDropdown";
import { useLocation } from "react-router-dom";

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

// Page titles and breadcrumbs mapping
const pageMeta: Record<string, { title: string; breadcrumb: string[] }> = {
  "/": { title: "Dashboard", breadcrumb: [] },
  "/financeiro": { title: "Financeiro", breadcrumb: ["Financeiro"] },
  "/contas-pagar": { title: "Contas a Pagar", breadcrumb: ["Financeiro", "Contas a Pagar"] },
  "/contas-receber": { title: "Contas a Receber", breadcrumb: ["Financeiro", "Contas a Receber"] },
  "/bancos": { title: "Bancos", breadcrumb: ["Financeiro", "Bancos"] },
  "/extrato-bancario": { title: "Extrato Bancário", breadcrumb: ["Financeiro", "Extrato Bancário"] },
  "/conciliacao": { title: "Conciliação", breadcrumb: ["Financeiro", "Conciliação"] },
  "/plano-contas": { title: "Plano de Contas", breadcrumb: ["Financeiro", "Plano de Contas"] },
  "/centros-custo": { title: "Centros de Custo", breadcrumb: ["Financeiro", "Centros de Custo"] },
  "/caixa": { title: "Caixa", breadcrumb: ["Financeiro", "Caixa"] },
  "/vendas": { title: "Vendas", breadcrumb: ["Vendas", "Pedidos"] },
  "/comissoes": { title: "Comissões", breadcrumb: ["Vendas", "Comissões"] },
  "/checkout": { title: "Checkout", breadcrumb: ["Vendas", "Checkout"] },
  "/itens-separados": { title: "Itens Separados", breadcrumb: ["Vendas", "Itens Separados"] },
  "/ordens-servico": { title: "Ordens de Serviço", breadcrumb: ["Ordens de Serviço"] },
  "/faturar-os": { title: "Faturar OS", breadcrumb: ["Ordens de Serviço", "Faturar"] },
  "/pedidos-compra": { title: "Pedidos de Compra", breadcrumb: ["Compras", "Pedidos"] },
  "/solicitacoes": { title: "Solicitações", breadcrumb: ["Compras", "Solicitações"] },
  "/aprovacoes": { title: "Aprovações", breadcrumb: ["Compras", "Aprovações"] },
  "/notas-compra": { title: "Notas de Compra", breadcrumb: ["Compras", "Notas"] },
  "/importar-xml": { title: "Importar XML", breadcrumb: ["Compras", "Importar XML"] },
  "/saldo-estoque": { title: "Saldo em Estoque", breadcrumb: ["Estoque", "Saldo"] },
  "/movimentacoes": { title: "Movimentações", breadcrumb: ["Estoque", "Movimentações"] },
  "/ajustes": { title: "Ajustes", breadcrumb: ["Estoque", "Ajustes"] },
  "/imprimir-etiquetas": { title: "Imprimir Etiquetas", breadcrumb: ["Estoque", "Etiquetas"] },
  "/clientes": { title: "Clientes", breadcrumb: ["Cadastros", "Clientes"] },
  "/produtos": { title: "Produtos", breadcrumb: ["Cadastros", "Produtos"] },
  "/servicos": { title: "Serviços", breadcrumb: ["Cadastros", "Serviços"] },
  "/fornecedores": { title: "Fornecedores", breadcrumb: ["Cadastros", "Fornecedores"] },
  "/usuarios": { title: "Usuários", breadcrumb: ["Cadastros", "Usuários"] },
  "/empresa": { title: "Empresa", breadcrumb: ["Configurações", "Empresa"] },
  "/permissoes": { title: "Permissões", breadcrumb: ["Configurações", "Permissões"] },
  "/integracoes": { title: "Integrações", breadcrumb: ["Configurações", "Integrações"] },
  "/logs": { title: "Logs", breadcrumb: ["Configurações", "Logs"] },
};

export function AppHeader({ onMenuClick, showMenuButton }: AppHeaderProps) {
  const location = useLocation();
  const currentPage = pageMeta[location.pathname] || { title: "Página", breadcrumb: [] };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
      {/* Left side: Menu button (mobile) + Title + Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        {showMenuButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="h-9 w-9 flex-shrink-0 -ml-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <div className="min-w-0">
          {/* Page title */}
          <h1 className="text-h1 text-foreground truncate">{currentPage.title}</h1>
          
          {/* Breadcrumb */}
          {currentPage.breadcrumb.length > 0 && (
            <div className="breadcrumb hidden sm:flex">
              {currentPage.breadcrumb.map((item, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="breadcrumb-separator">›</span>}
                  <span className={index === currentPage.breadcrumb.length - 1 ? "breadcrumb-current" : ""}>
                    {item}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar clientes, produtos, pedidos..."
            className="w-full pl-10 bg-muted border-0 h-10"
          />
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Company Selector - Sempre visível */}
        <CompanySelector />

        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden">
          <Search className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* AI Notifications */}
        <AINotificationsDropdown />

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Nova Venda</DropdownMenuItem>
            <DropdownMenuItem>Nova OS</DropdownMenuItem>
            <DropdownMenuItem>Novo Cliente</DropdownMenuItem>
            <DropdownMenuItem>Novo Produto</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  AD
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">Admin</span>
                <span className="text-xs text-muted-foreground font-normal">admin@wedo.com</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Preferências
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
