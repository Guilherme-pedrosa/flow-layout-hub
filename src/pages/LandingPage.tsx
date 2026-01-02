import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  FileText, 
  Users, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  MessageSquare,
  PieChart,
  DollarSign,
  Package,
  ClipboardList,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoWai from "@/assets/logo-wai-erp.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "IA em Todas as Decisões",
      description: "Inteligência artificial que analisa padrões, sugere ações e automatiza processos em tempo real."
    },
    {
      icon: TrendingUp,
      title: "CFO Bot Vigilante",
      description: "Monitora seu fluxo de caixa 24/7, alertando sobre riscos e oportunidades antes que aconteçam."
    },
    {
      icon: Shield,
      title: "Auditoria Automática",
      description: "Cada pedido de compra é auditado automaticamente pela IA, garantindo conformidade e economia."
    },
    {
      icon: Zap,
      title: "Automação Inteligente",
      description: "Desde emissão de NF-e até conciliação bancária, tudo automatizado com inteligência."
    }
  ];

  const modules = [
    { icon: DollarSign, name: "Financeiro", description: "Contas a pagar/receber com IA preditiva" },
    { icon: Package, name: "Estoque", description: "Gestão inteligente com sugestões de compra" },
    { icon: FileText, name: "Fiscal", description: "NF-e, NFS-e e CT-e automatizados" },
    { icon: ClipboardList, name: "Compras", description: "Pedidos com auditoria de IA" },
    { icon: Users, name: "Clientes", description: "CRM integrado com análise comportamental" },
    { icon: BarChart3, name: "Relatórios", description: "Dashboards com insights de IA" }
  ];

  const aiFeatures = [
    "Análise preditiva de fluxo de caixa",
    "Sugestões automáticas de precificação",
    "Detecção de anomalias em transações",
    "Recomendações de estoque baseadas em demanda",
    "Auditoria automática de pedidos de compra",
    "Conciliação bancária inteligente",
    "Alertas proativos de riscos financeiros",
    "Chat com IA financeira especializada"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-slate-950/95 backdrop-blur-md shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoWai} alt="WAI ERP" className="h-10" />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">Funcionalidades</a>
            <a href="#ai" className="text-slate-300 hover:text-white transition-colors">IA</a>
            <a href="#modules" className="text-slate-300 hover:text-white transition-colors">Módulos</a>
          </nav>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10"
              onClick={() => navigate("/auth")}
            >
              Entrar
            </Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              onClick={() => navigate("/auth")}
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Powered by Artificial Intelligence</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              O ERP que{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  pensa
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
              </span>
              {" "}junto com você
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Inteligência Artificial em cada tela, auxiliando em todas as decisões do seu negócio em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg" 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-lg px-8 py-6 rounded-xl shadow-lg shadow-emerald-500/25"
                onClick={() => navigate("/auth")}
              >
                Acessar o Sistema
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-600 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Conhecer Mais
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: "95%", label: "Automação" },
                { value: "24/7", label: "Monitoramento IA" },
                { value: "3x", label: "Mais Produtividade" },
                { value: "0", label: "Erros Manuais" }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-emerald-400">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-slate-500" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              IA que <span className="text-emerald-400">Transforma</span> sua Gestão
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Cada módulo do WAI ERP é potencializado por inteligência artificial, 
              trazendo insights e automações que você nunca viu antes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card 
                key={feature.title}
                className="bg-slate-800/50 border-slate-700/50 p-6 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/5 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
                <Bot className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">Inteligência Artificial</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Uma IA que entende seu{" "}
                <span className="text-emerald-400">negócio</span>
              </h2>
              
              <p className="text-lg text-slate-300 mb-8">
                O WAI ERP não é apenas um sistema de gestão. É um parceiro inteligente que 
                aprende com seus dados, identifica padrões e sugere as melhores decisões 
                para o crescimento do seu negócio.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {aiFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* AI Chat Preview */}
              <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Assistente WAI</div>
                    <div className="text-xs text-emerald-400">Online • Analisando dados...</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="bg-slate-700/50 rounded-2xl rounded-tl-none p-4 max-w-sm">
                      <p className="text-slate-200 text-sm">
                        Bom dia! Identifiquei que seu fluxo de caixa terá um gap de R$ 15.000 na próxima semana. 
                        Posso sugerir 3 ações para evitar isso?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl rounded-tr-none p-4 max-w-sm">
                      <p className="text-emerald-100 text-sm">
                        Sim, quais são as sugestões?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="bg-slate-700/50 rounded-2xl rounded-tl-none p-4 max-w-sm">
                      <p className="text-slate-200 text-sm mb-3">
                        Baseado nos seus dados, sugiro:
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <span className="w-5 h-5 bg-emerald-500/30 rounded-full flex items-center justify-center text-xs">1</span>
                          Antecipar recebíveis de R$ 8.500
                        </div>
                        <div className="flex items-center gap-2 text-emerald-300">
                          <span className="w-5 h-5 bg-emerald-500/30 rounded-full flex items-center justify-center text-xs">2</span>
                          Renegociar fornecedor X (+15 dias)
                        </div>
                        <div className="flex items-center gap-2 text-emerald-300">
                          <span className="w-5 h-5 bg-emerald-500/30 rounded-full flex items-center justify-center text-xs">3</span>
                          Ajustar cronograma de compras
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 bg-slate-900/50 rounded-xl p-3">
                  <MessageSquare className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-500 text-sm">Pergunte ao assistente...</span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tudo que você precisa, <span className="text-emerald-400">integrado</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Módulos completos que conversam entre si, eliminando retrabalho e maximizando sua eficiência.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {modules.map((module) => (
              <Card 
                key={module.name}
                className="bg-slate-800/30 border-slate-700/50 p-6 hover:bg-slate-800/60 transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-700/50 group-hover:bg-emerald-500/20 rounded-xl flex items-center justify-center transition-colors">
                    <module.icon className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{module.name}</h3>
                    <p className="text-slate-400 text-sm">{module.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pronto para ter uma <span className="text-emerald-400">IA</span> gerenciando seu negócio?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Junte-se a centenas de empresas que já estão economizando tempo e dinheiro 
              com o WAI ERP.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold text-lg px-10 py-6 rounded-xl shadow-lg"
              onClick={() => navigate("/auth")}
            >
              Acessar o Sistema
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoWai} alt="WAI ERP" className="h-8" />
              <span className="text-slate-500">© 2025 WAI ERP. Todos os direitos reservados.</span>
            </div>
            <div className="flex items-center gap-6 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
