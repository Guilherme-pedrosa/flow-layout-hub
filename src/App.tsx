import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/receber/Vendas";
import Recebimentos from "./pages/receber/Recebimentos";
import Clientes from "./pages/receber/Clientes";
import Compras from "./pages/pagar/Compras";
import Pagamentos from "./pages/pagar/Pagamentos";
import Fornecedores from "./pages/pagar/Fornecedores";
import Produtos from "./pages/estoque/Produtos";
import Movimentacoes from "./pages/estoque/Movimentacoes";
import OrdensServico from "./pages/servicos/OrdensServico";
import Agenda from "./pages/servicos/Agenda";
import NotasFiscais from "./pages/fiscal/NotasFiscais";
import Impostos from "./pages/fiscal/Impostos";
import Caixa from "./pages/financeiro/Caixa";
import Bancos from "./pages/financeiro/Bancos";
import Conciliacao from "./pages/financeiro/Conciliacao";
import Relatorios from "./pages/financeiro/Relatorios";
import Empresa from "./pages/configuracoes/Empresa";
import Usuarios from "./pages/configuracoes/Usuarios";
import Permissoes from "./pages/configuracoes/Permissoes";
import NotFound from "./pages/NotFound";

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
            {/* Receber */}
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/recebimentos" element={<Recebimentos />} />
            <Route path="/clientes" element={<Clientes />} />
            {/* Pagar */}
            <Route path="/compras" element={<Compras />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            {/* Estoque */}
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/movimentacoes" element={<Movimentacoes />} />
            {/* Serviços */}
            <Route path="/ordens-servico" element={<OrdensServico />} />
            <Route path="/agenda" element={<Agenda />} />
            {/* Fiscal */}
            <Route path="/notas-fiscais" element={<NotasFiscais />} />
            <Route path="/impostos" element={<Impostos />} />
            {/* Financeiro */}
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/bancos" element={<Bancos />} />
            <Route path="/conciliacao" element={<Conciliacao />} />
            <Route path="/relatorios" element={<Relatorios />} />
            {/* Configurações */}
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/permissoes" element={<Permissoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
