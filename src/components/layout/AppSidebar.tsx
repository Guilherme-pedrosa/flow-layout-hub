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
  BookOpen,
  Target,
  Tag,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import logoPontoAPonto from "@/assets/logo-ponto-a-ponto.png";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

const menuGroups: { label: string; items: MenuItem[] }[] = [
  {
    label: "",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Vendas", icon: ShoppingCart, href: "/vendas" },
      { title: "Config. Vendas", icon: Wrench, href: "/vendas-config" },
      { title: "Checkout", icon: CircleDollarSign, href: "/checkout", badge: 3 },
      { title: "Itens Separados", icon: Package, href: "/itens-separados" },
      { title: "Ordens de Serviço", icon: ClipboardList, href: "/ordens-servico" },
      { title: "Config. OS", icon: Wrench, href: "/ordens-servico-config" },
    ],
  },
  {
    label: "Compras",
    items: [
      { title: "Pedidos de Compra", icon: FileSpreadsheet, href: "/pedidos-compra" },
      { title: "Solicitações", icon: FileText, href: "/solicitacoes" },
      { title: "Aprovações", icon: CheckSquare, href: "/aprovacoes", badge: 5 },
      { title: "Notas de Compra", icon: FileSpreadsheet, href: "/notas-compra" },
      { title: "Importar XML", icon: FileSpreadsheet, href: "/importar-xml" },
      { title: "Configurações", icon: Wrench, href: "/compras-config" },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Saldo", icon: Package, href: "/saldo-estoque" },
      { title: "Movimentações", icon: ArrowRightLeft, href: "/movimentacoes" },
      { title: "Imprimir Etiquetas", icon: Printer, href: "/imprimir-etiquetas" },
      { title: "Ajustes", icon: AlertTriangle, href: "/ajustes" },
    ],
  },
  {
    label: "Faturamento",
    items: [
      { title: "Faturar OS", icon: Receipt, href: "/faturar-os", badge: 2 },
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
      { title: "Extrato Bancário", icon: FileSpreadsheet, href: "/extrato-bancario" },
      { title: "Conciliação", icon: PiggyBank, href: "/conciliacao" },
      { title: "Config. Bancária", icon: Wrench, href: "/configuracao-bancaria" },
      { title: "Plano de Contas", icon: BookOpen, href: "/plano-contas" },
      { title: "Centros de Custo", icon: Target, href: "/centros-custo" },
      { title: "Categorias Rápidas", icon: Tag, href: "/categorias-rapidas" },
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
      { title: "Usuários", icon: Shield, href: "/permissoes" },
      { title: "Integrações", icon: Plug, href: "/integracoes" },
      { title: "Logs", icon: LogsIcon, href: "/logs" },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-3 animate-fade-in">
            <img
              src={logoPontoAPonto}
              alt="Wedo ERP"
              className="h-9 object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4 scrollbar-thin">
        <nav className="space-y-6 px-3">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {!collapsed && group.label && (
                <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </h3>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                          collapsed && "justify-center px-2",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-foreground relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-accent before:rounded-r"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )
                      }
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        "group-hover:text-sidebar-foreground"
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <div className="text-[11px] text-sidebar-foreground/40 text-center">
            Wedo ERP v2.0
          </div>
        </div>
      )}
    </aside>
  );
}