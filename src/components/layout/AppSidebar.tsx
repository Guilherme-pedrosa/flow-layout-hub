import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  CircleDollarSign,
  ClipboardList,
  FileText,
  CheckSquare,
  FileSpreadsheet,
  Package,
  ArrowRightLeft,
  AlertTriangle,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Wallet,
  Landmark,
  PiggyBank,
  Users,
  Boxes,
  Wrench,
  Building2,
  UserCog,
  Building,
  Shield,
  Plug,
  FileText as LogsIcon,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import logoPontoAPonto from "@/assets/logo-ponto-a-ponto.png";

// Mock: número de vendas pendentes no checkout (substituir por estado real depois)
const checkoutPendingCount = 3;

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuGroups = [
  {
    label: "Início",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Vendas", icon: ShoppingCart, href: "/vendas" },
      { title: "Checkout", icon: CircleDollarSign, href: "/checkout", highlight: true, badge: checkoutPendingCount },
      { title: "Ordens de Serviço", icon: ClipboardList, href: "/ordens-servico" },
    ],
  },
  {
    label: "Compras",
    items: [
      { title: "Solicitações", icon: FileText, href: "/solicitacoes" },
      { title: "Aprovações", icon: CheckSquare, href: "/aprovacoes" },
      { title: "Notas de Compra", icon: FileSpreadsheet, href: "/notas-compra" },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Saldo", icon: Package, href: "/saldo-estoque" },
      { title: "Movimentações", icon: ArrowRightLeft, href: "/movimentacoes" },
      { title: "Ajustes", icon: AlertTriangle, href: "/ajustes", warning: true, tooltip: "Ajustes de estoque são auditados" },
    ],
  },
  {
    label: "Faturamento",
    items: [
      { title: "Faturar OS", icon: Receipt, href: "/faturar-os", highlight: true },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Contas a Receber", icon: ArrowDownToLine, href: "/contas-receber" },
      { title: "Contas a Pagar", icon: ArrowUpFromLine, href: "/contas-pagar" },
      { title: "Renegociações", icon: RefreshCw, href: "/renegociacoes" },
      { title: "Caixa", icon: Wallet, href: "/caixa" },
      { title: "Bancos", icon: Landmark, href: "/bancos" },
      { title: "Conciliação", icon: PiggyBank, href: "/conciliacao" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Clientes", icon: Users, href: "/clientes" },
      { title: "Produtos", icon: Boxes, href: "/produtos" },
      { title: "Serviços", icon: Wrench, href: "/servicos" },
      { title: "Fornecedores", icon: Building2, href: "/fornecedores" },
      { title: "Usuários", icon: UserCog, href: "/usuarios" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Empresa", icon: Building, href: "/empresa" },
      { title: "Permissões", icon: Shield, href: "/permissoes" },
      { title: "Integrações", icon: Plug, href: "/integracoes" },
      { title: "Logs", icon: LogsIcon, href: "/logs" },
    ],
  },
];

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
  warning?: boolean;
  badge?: number;
  tooltip?: string;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const renderMenuItem = (item: MenuItem) => {
    const content = (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
            item.highlight && !isActive && "text-primary font-semibold",
            item.warning && !isActive && "text-amber-400 font-semibold",
            collapsed && "justify-center px-2"
          )
        }
        title={collapsed ? item.title : undefined}
      >
        <item.icon className={cn(
          "h-5 w-5 shrink-0",
          item.highlight && "text-primary",
          item.warning && "text-amber-400"
        )} />
        {!collapsed && (
          <span className="flex-1">{item.title}</span>
        )}
        {!collapsed && item.badge && item.badge > 0 && (
          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">
            {item.badge}
          </Badge>
        )}
        {!collapsed && item.warning && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-400 bg-amber-400/10">
            ⚠️
          </Badge>
        )}
      </NavLink>
    );

    if (item.tooltip) {
      return (
        <TooltipProvider key={item.href}>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-orange-500 text-white border-orange-500">
              <p>{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <img
            src={logoPontoAPonto}
            alt="Ponto a Ponto"
            className="h-10 object-contain animate-fade-in"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4 scrollbar-thin">
        <nav className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.label}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    {renderMenuItem(item)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
