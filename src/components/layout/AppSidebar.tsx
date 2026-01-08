import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  CircleDollarSign,
  ClipboardList,
  FileText,
  CheckSquare,
  FileSpreadsheet,
  Package,
  Headphones,
  ArrowRightLeft,
  AlertTriangle,
  Bell,
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
  ChevronRight,
  Menu,
  BookOpen,
  Target,
  Tag,
  Printer,
  X,
  LogOut,
  ChevronDown,
  Upload,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import logoWai from "@/assets/logo-wai-erp.png";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const menuGroups: MenuGroup[] = [
  {
    label: "",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
    defaultOpen: true,
  },
  {
    label: "Financeiro",
    items: [
      { title: "Visão Geral", icon: CircleDollarSign, href: "/financeiro" },
      { title: "Contas a Receber", icon: ArrowDownToLine, href: "/contas-receber" },
      { title: "Contas a Pagar", icon: ArrowUpFromLine, href: "/contas-pagar" },
      { title: "Caixa", icon: Wallet, href: "/caixa" },
      { title: "Bancos", icon: Landmark, href: "/bancos" },
      { title: "Extrato Bancário", icon: FileSpreadsheet, href: "/extrato-bancario" },
      { title: "Conciliação", icon: PiggyBank, href: "/conciliacao" },
      { title: "Plano de Contas", icon: BookOpen, href: "/plano-contas" },
      { title: "Centros de Custo", icon: Target, href: "/centros-custo" },
    ],
    defaultOpen: true,
  },
  {
    label: "Vendas",
    items: [
      { title: "Pedidos", icon: ShoppingCart, href: "/vendas" },
      { title: "Comissões", icon: Target, href: "/comissoes" },
      { title: "Itens Separados", icon: Package, href: "/itens-separados" },
      { title: "Configurações", icon: UserCog, href: "/vendas-config" },
    ],
  },
  {
    label: "Ordens de Serviço",
    items: [
      { title: "Lista de OS", icon: ClipboardList, href: "/ordens-servico" },
      { title: "Chamados", icon: Headphones, href: "/chamados" },
      { title: "Equipamentos", icon: Boxes, href: "/equipamentos" },
      { title: "Faturar OS", icon: Receipt, href: "/faturar-os", badge: 2 },
      { title: "Configurações", icon: UserCog, href: "/ordens-servico-config" },
    ],
  },
  {
    label: "Notas Fiscais",
    items: [
      { title: "NF-e (Produtos)", icon: FileText, href: "/notas-fiscais" },
      { title: "NFS-e (Serviços)", icon: FileText, href: "/notas-fiscais-servico" },
      { title: "Configurações NF", icon: UserCog, href: "/configuracoes/nfe" },
    ],
  },
  {
    label: "Compras",
    items: [
      { title: "Pedidos de Compra", icon: FileSpreadsheet, href: "/pedidos-compra" },
      { title: "Check-in", icon: ArrowDownToLine, href: "/recebimento" },
      { title: "Solicitações", icon: FileText, href: "/solicitacoes" },
      { title: "Aprovações", icon: CheckSquare, href: "/aprovacoes", badge: 5 },
      { title: "Notas de Compra", icon: FileSpreadsheet, href: "/notas-compra" },
      { title: "Importar XML", icon: FileSpreadsheet, href: "/importar-xml" },
      { title: "Configurações", icon: UserCog, href: "/compras-config" },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Saldo", icon: Package, href: "/saldo-estoque" },
      { title: "Movimentações", icon: ArrowRightLeft, href: "/movimentacoes" },
      { title: "Checkout", icon: CircleDollarSign, href: "/checkout", badge: 3 },
      { title: "Ajustes", icon: AlertTriangle, href: "/ajustes" },
    ],
  },
  {
    label: "Produtos",
    items: [
      { title: "Gerenciar Produtos", icon: Boxes, href: "/produtos" },
      { title: "Valores de Venda", icon: CircleDollarSign, href: "/valores-venda" },
      { title: "Etiquetas", icon: Printer, href: "/etiquetas" },
      { title: "Categorias e Marcas", icon: Tag, href: "/categorias-produtos" },
      { title: "Localizações", icon: Target, href: "/localizacoes" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Clientes", icon: Users, href: "/clientes" },
      { title: "Serviços", icon: Wrench, href: "/servicos" },
      { title: "Fornecedores", icon: Building2, href: "/fornecedores" },
      { title: "Importar Pessoas", icon: Upload, href: "/cadastros/importar-pessoas" },
    ],
  },
  {
    label: "RH",
    items: [
      { title: "Colaboradores", icon: Users, href: "/rh/colaboradores" },
      { title: "Controle Integrações", icon: CheckSquare, href: "/rh/integracoes" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Empresa", icon: Building, href: "/empresa" },
      { title: "Usuários", icon: UserCog, href: "/usuarios" },
      { title: "Permissões", icon: Shield, href: "/permissoes" },
      { title: "Situações Financeiras", icon: CircleDot, href: "/situacoes-financeiras" },
      { title: "Central de Alertas", icon: Bell, href: "/configuracoes/alertas" },
      { title: "Integrações", icon: Plug, href: "/integracoes" },
      { title: "Logs", icon: LogsIcon, href: "/logs" },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Initialize open groups and auto-expand active group
  useEffect(() => {
    const newOpenGroups: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      if (group.defaultOpen) {
        newOpenGroups[group.label] = true;
      }
      // Auto-expand group containing active route
      if (group.items.some(item => location.pathname === item.href)) {
        newOpenGroups[group.label] = true;
      }
    });
    setOpenGroups(newOpenGroups);
  }, [location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header with Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        {(!collapsed || mobileOpen) ? (
          <>
            <img 
              src={logoWai} 
              alt="WAI ERP" 
              className="h-10 w-auto"
            />
          </>
        ) : (
          <span className="text-lg font-bold text-white mx-auto">W</span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {menuGroups.map((group, groupIndex) => {
            const isGroupActive = group.items.some(item => location.pathname === item.href);
            const isOpen = openGroups[group.label] ?? false;
            
            return (
              <div key={groupIndex} className={cn(group.label && "mt-4")}>
                {/* Group label (collapsible) */}
                {group.label && (!collapsed || mobileOpen) && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider",
                      "text-sidebar-foreground/50 hover:text-sidebar-foreground/70 transition-colors"
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown 
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                )}
                
                {/* Menu items */}
                <ul 
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-200",
                    !group.label && "space-y-0.5", // No collapse for items without label
                    group.label && (!collapsed || mobileOpen) && !isOpen && "max-h-0 opacity-0",
                    group.label && (!collapsed || mobileOpen) && isOpen && "max-h-[500px] opacity-100"
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          className={cn(
                            "sidebar-item",
                            collapsed && !mobileOpen && "justify-center px-2",
                            isActive && "sidebar-item-active"
                          )}
                          title={collapsed && !mobileOpen ? item.title : undefined}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {(!collapsed || mobileOpen) && (
                            <>
                              <span className="flex-1 truncate text-[13px]">{item.title}</span>
                              {item.badge && item.badge > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer - User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && !mobileOpen && "justify-center"
        )}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm font-medium">
              AD
            </AvatarFallback>
          </Avatar>
          {(!collapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Admin</p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">admin@wedo.com</p>
            </div>
          )}
          {(!collapsed || mobileOpen) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse toggle button */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={mobileOpen ? onMobileClose : onToggle}
          className={cn(
            "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && !mobileOpen && "px-2"
          )}
        >
          {mobileOpen ? (
            <>
              <X className="h-4 w-4 mr-2" />
              <span>Fechar</span>
            </>
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Recolher menu</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Mobile: drawer from left
  if (mobileOpen !== undefined) {
    return (
      <>
        {/* Desktop sidebar - 240px width */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col bg-sidebar transition-all duration-200",
            collapsed ? "w-16" : "w-60"
          )}
        >
          {sidebarContent}
        </aside>

        {/* Mobile sidebar (drawer) - Full 240px */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex md:hidden h-screen w-72 flex-col bg-sidebar transition-transform duration-300 shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Fallback for non-mobile aware usage
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
