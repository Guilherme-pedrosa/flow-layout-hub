import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { CompanyProvider } from "@/contexts/CompanyContext";

// Pages
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";

// Operação
import Vendas from "./pages/receber/Vendas";
import ConfiguracoesVendas from "./pages/receber/ConfiguracoesVendas";
import Checkout from "./pages/operacao/Checkout";
import ItensSeparados from "./pages/operacao/ItensSeparados";
import OrdensServico from "./pages/servicos/OrdensServico";
import OrdemServicoFormPage from "./pages/servicos/OrdemServicoFormPage";
import ConfiguracoesOS from "./pages/servicos/ConfiguracoesOS";
import Equipamentos from "./pages/servicos/Equipamentos";
import VendaFormPage from "./pages/receber/VendaFormPage";
import Comissoes from "./pages/vendas/Comissoes";

// Páginas públicas
import OrcamentoView from "./pages/public/OrcamentoView";

// Chamados
import ChamadosList from "./pages/chamados/ChamadosList";
import ChamadoDetail from "./pages/chamados/ChamadoDetail";
import NovoChamado from "./pages/chamados/NovoChamado";

// RH
import RhColaboradoresPage from "./pages/rh/Colaboradores";
import RhControleIntegracoes from "./pages/rh/ControleIntegracoes";

import PedidosCompra from "./pages/compras/PedidosCompra";
import Recebimento from "./pages/compras/Recebimento";
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
import DashboardFinanceiro from "./pages/financeiro/DashboardFinanceiro";
import ContasReceber from "./pages/financeiro/ContasReceber";
import ContasPagar from "./pages/financeiro/ContasPagar";
import Renegociacoes from "./pages/financeiro/Renegociacoes";
import Caixa from "./pages/financeiro/Caixa";
import Bancos from "./pages/financeiro/Bancos";
import Conciliacao from "./pages/financeiro/Conciliacao";
import PlanoContas from "./pages/financeiro/PlanoContas";
import CentrosCusto from "./pages/financeiro/CentrosCusto";
import CategoriasRapidas from "./pages/financeiro/CategoriasRapidas";
import ConfiguracaoBancaria from "./pages/financeiro/ConfiguracaoBancaria";
import ExtratoBancario from "./pages/financeiro/ExtratoBancario";

// Cadastros
import Clientes from "./pages/cadastros/Clientes";
import Servicos from "./pages/cadastros/Servicos";
import Fornecedores from "./pages/cadastros/Fornecedores";
import Usuarios from "./pages/cadastros/Usuarios";
import ImportarPessoas from "./pages/cadastros/ImportarPessoas";

// Produtos
import GerenciarProdutos from "./pages/produtos/GerenciarProdutos";
import ValoresVenda from "./pages/produtos/ValoresVenda";
import Etiquetas from "./pages/produtos/Etiquetas";
import Categorias from "./pages/produtos/Categorias";
import Localizacoes from "./pages/produtos/Localizacoes";

// Notas Fiscais
import NotasFiscaisPage from "./pages/notas-fiscais/NotasFiscaisPage";
import EmitirNFePage from "./pages/notas-fiscais/EmitirNFePage";
import NotasFiscaisServicoPage from "./pages/notas-fiscais/NotasFiscaisServicoPage";
import EmitirNFSePage from "./pages/notas-fiscais/EmitirNFSePage";
import ConfiguracaoNFe from "./pages/configuracoes/ConfiguracaoNFe";

// Configurações
import Empresa from "./pages/configuracoes/Empresa";
import Permissoes from "./pages/configuracoes/Permissoes";
import Integracoes from "./pages/configuracoes/Integracoes";
import Logs from "./pages/configuracoes/Logs";
import SituacoesFinanceiras from "./pages/configuracoes/SituacoesFinanceiras";
import CentralAlertas from "./pages/configuracoes/CentralAlertas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CompanyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas (sem layout) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/orcamento/:token" element={<OrcamentoView />} />

          {/* Rotas com layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Operação */}
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas/nova" element={<VendaFormPage />} />
            <Route path="/vendas/:id" element={<VendaFormPage />} />
            <Route path="/vendas-config" element={<ConfiguracoesVendas />} />
            <Route path="/comissoes" element={<Comissoes />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/itens-separados" element={<ItensSeparados />} />
            <Route path="/ordens-servico" element={<OrdensServico />} />
            <Route path="/ordens-servico/nova" element={<OrdemServicoFormPage />} />
            <Route path="/ordens-servico/:id" element={<OrdemServicoFormPage />} />
            <Route path="/equipamentos" element={<Equipamentos />} />
            <Route path="/chamados" element={<ChamadosList />} />
            <Route path="/chamados/novo" element={<NovoChamado />} />
            <Route path="/chamados/:id" element={<ChamadoDetail />} />
            <Route path="/chamados/:id/editar" element={<ChamadoDetail />} />
            <Route path="/ordens-servico-config" element={<ConfiguracoesOS />} />
            
            {/* RH */}
            <Route path="/rh/colaboradores" element={<RhColaboradoresPage />} />
            <Route path="/rh/integracoes" element={<RhControleIntegracoes />} />
            
            {/* Compras */}
            <Route path="/pedidos-compra" element={<PedidosCompra />} />
            <Route path="/recebimento" element={<Recebimento />} />
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
            
            {/* Notas Fiscais */}
            <Route path="/notas-fiscais" element={<NotasFiscaisPage />} />
            <Route path="/notas-fiscais/adicionar" element={<EmitirNFePage />} />
            <Route path="/notas-fiscais/:id" element={<EmitirNFePage />} />
            <Route path="/notas-fiscais-servico" element={<NotasFiscaisServicoPage />} />
            <Route path="/notas-fiscais-servico/adicionar" element={<EmitirNFSePage />} />
            <Route path="/notas-fiscais-servico/:id" element={<EmitirNFSePage />} />
            <Route path="/configuracoes/nfe" element={<ConfiguracaoNFe />} />
            
            {/* Financeiro */}
            <Route path="/financeiro" element={<DashboardFinanceiro />} />
            <Route path="/contas-receber" element={<ContasReceber />} />
            <Route path="/contas-pagar" element={<ContasPagar />} />
            <Route path="/contas-a-pagar" element={<ContasPagar />} />
            <Route path="/renegociacoes" element={<Renegociacoes />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/fluxo-de-caixa" element={<Caixa />} />
            <Route path="/bancos" element={<Bancos />} />
            <Route path="/conciliacao" element={<Conciliacao />} />
            <Route path="/plano-contas" element={<PlanoContas />} />
            <Route path="/centros-custo" element={<CentrosCusto />} />
            <Route path="/categorias-rapidas" element={<CategoriasRapidas />} />
            <Route path="/configuracao-bancaria" element={<ConfiguracaoBancaria />} />
            <Route path="/extrato-bancario" element={<ExtratoBancario />} />
            
            {/* Cadastros */}
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<Clientes />} />
            <Route path="/clientes/:id/:action" element={<Clientes />} />
            <Route path="/cadastros/importar-pessoas" element={<ImportarPessoas />} />
            
            {/* Produtos */}
            <Route path="/produtos" element={<GerenciarProdutos />} />
            <Route path="/valores-venda" element={<ValoresVenda />} />
            <Route path="/etiquetas" element={<Etiquetas />} />
            <Route path="/categorias-produtos" element={<Categorias />} />
            <Route path="/localizacoes" element={<Localizacoes />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/usuarios" element={<Usuarios />} />
            
            {/* Configurações */}
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/permissoes" element={<Permissoes />} />
            <Route path="/integracoes" element={<Integracoes />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/situacoes-financeiras" element={<SituacoesFinanceiras />} />
            <Route path="/configuracoes/alertas" element={<CentralAlertas />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </CompanyProvider>
  </QueryClientProvider>
);

export default App;
