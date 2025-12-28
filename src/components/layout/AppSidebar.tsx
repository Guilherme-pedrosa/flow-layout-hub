import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Wrench,
  FileText,
  Wallet,
  Settings,
  ShoppingCart,
  Receipt,
  Users,
  ShoppingBag,
  CreditCard,
  Building2,
  Boxes,
  ArrowRightLeft,
  ClipboardList,
  Calendar,
  FileSpreadsheet,
  Calculator,
  Landmark,
  PiggyBank,
  BarChart3,
  Building,
  UserCog,
  Shield,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import logoPontoAPonto from "@/assets/logo-ponto-a-ponto.png";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuGroups = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    label: "Receber",
    items: [
      { title: "Vendas", icon: ShoppingCart, href: "/vendas" },
      { title: "Recebimentos", icon: Receipt, href: "/recebimentos" },
      { title: "Clientes", icon: Users, href: "/clientes" },
    ],
  },
  {
    label: "Pagar",
    items: [
      { title: "Compras", icon: ShoppingBag, href: "/compras" },
      { title: "Pagamentos", icon: CreditCard, href: "/pagamentos" },
      { title: "Fornecedores", icon: Building2, href: "/fornecedores" },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Produtos", icon: Boxes, href: "/produtos" },
      { title: "Movimentações", icon: ArrowRightLeft, href: "/movimentacoes" },
    ],
  },
  {
    label: "Serviços",
    items: [
      { title: "Ordens de Serviço", icon: ClipboardList, href: "/ordens-servico" },
      { title: "Agenda", icon: Calendar, href: "/agenda" },
    ],
  },
  {
    label: "Fiscal",
    items: [
      { title: "Notas Fiscais", icon: FileSpreadsheet, href: "/notas-fiscais" },
      { title: "Impostos", icon: Calculator, href: "/impostos" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Caixa", icon: Wallet, href: "/caixa" },
      { title: "Bancos", icon: Landmark, href: "/bancos" },
      { title: "Conciliação", icon: PiggyBank, href: "/conciliacao" },
      { title: "Relatórios", icon: BarChart3, href: "/relatorios" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Empresa", icon: Building, href: "/empresa" },
      { title: "Usuários", icon: UserCog, href: "/usuarios" },
      { title: "Permissões", icon: Shield, href: "/permissoes" },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
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
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
                          collapsed && "justify-center px-2"
                        )
                      }
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
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
