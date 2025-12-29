import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";

// Pages
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Operação
import Vendas from "./pages/receber/Vendas";
import ConfiguracoesVendas from "./pages/receber/ConfiguracoesVendas";
import Checkout from "./pages/operacao/Checkout";
import OrdensServico from "./pages/servicos/OrdensServico";
import ConfiguracoesOS from "./pages/servicos/ConfiguracoesOS";

// Compras
import PedidosCompra from "./pages/compras/PedidosCompra";
import Solicitacoes from "./pages/compras/Solicitacoes";
import Aprovacoes from "./pages/compras/Aprovacoes";
import NotasCompra from "./pages/compras/NotasCompra";
import ImportarXML from "./pages/compras/ImportarXML";
import ConfiguracoesCompras from "./pages/compras/ConfiguracoesCompras";

// Estoque
import Saldo from "./pages/estoque/Saldo";
import Movimentacoes from "./pages/estoque/Movimentacoes";
import Ajustes from "./pages/estoque/Ajustes";
import ImprimirEtiquetas from "./pages/estoque/ImprimirEtiquetas";

// Faturamento
import FaturarOS from "./pages/faturamento/FaturarOS";

// Financeiro
import ContasReceber from "./pages/financeiro/ContasReceber";
import ContasPagar from "./pages/financeiro/ContasPagar";
import Renegociacoes from "./pages/financeiro/Renegociacoes";
import Caixa from "./pages/financeiro/Caixa";
import Bancos from "./pages/financeiro/Bancos";
import Conciliacao from "./pages/financeiro/Conciliacao";
import PlanoContas from "./pages/financeiro/PlanoContas";
import CentrosCusto from "./pages/financeiro/CentrosCusto";
import CategoriasRapidas from "./pages/financeiro/CategoriasRapidas";

// Cadastros
import Clientes from "./pages/cadastros/Clientes";
import Produtos from "./pages/cadastros/Produtos";
import Servicos from "./pages/cadastros/Servicos";
import Fornecedores from "./pages/cadastros/Fornecedores";
import Usuarios from "./pages/cadastros/Usuarios";

// Configurações
import Empresa from "./pages/configuracoes/Empresa";
import Permissoes from "./pages/configuracoes/Permissoes";
import Integracoes from "./pages/configuracoes/Integracoes";
import Logs from "./pages/configuracoes/Logs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            
            {/* Operação */}
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas-config" element={<ConfiguracoesVendas />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/ordens-servico" element={<OrdensServico />} />
            <Route path="/ordens-servico-config" element={<ConfiguracoesOS />} />
            
            {/* Compras */}
            <Route path="/pedidos-compra" element={<PedidosCompra />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/aprovacoes" element={<Aprovacoes />} />
            <Route path="/notas-compra" element={<NotasCompra />} />
            <Route path="/importar-xml" element={<ImportarXML />} />
            <Route path="/compras-config" element={<ConfiguracoesCompras />} />
            
            {/* Estoque */}
            <Route path="/saldo-estoque" element={<Saldo />} />
            <Route path="/movimentacoes" element={<Movimentacoes />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/imprimir-etiquetas" element={<ImprimirEtiquetas />} />
            
            {/* Faturamento */}
            <Route path="/faturar-os" element={<FaturarOS />} />
            
            {/* Financeiro */}
            <Route path="/contas-receber" element={<ContasReceber />} />
            <Route path="/contas-pagar" element={<ContasPagar />} />
            <Route path="/renegociacoes" element={<Renegociacoes />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/bancos" element={<Bancos />} />
            <Route path="/conciliacao" element={<Conciliacao />} />
            <Route path="/plano-contas" element={<PlanoContas />} />
            <Route path="/centros-custo" element={<CentrosCusto />} />
            <Route path="/categorias-rapidas" element={<CategoriasRapidas />} />
            
            {/* Cadastros */}
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<Clientes />} />
            <Route path="/clientes/:id/:action" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/usuarios" element={<Usuarios />} />
            
            {/* Configurações */}
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/permissoes" element={<Permissoes />} />
            <Route path="/integracoes" element={<Integracoes />} />
            <Route path="/logs" element={<Logs />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
