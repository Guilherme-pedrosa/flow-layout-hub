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
  DollarSign,
  Package,
  ClipboardList,
  ChevronDown,
  Building2,
  LineChart,
  Lock,
  Clock,
  Headphones,
  Award,
  Target,
  Wallet,
  Calculator,
  Truck,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoWai from "@/assets/logo-wai-completo.png";

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
    { icon: DollarSign, name: "Financeiro Completo", description: "Contas a pagar e receber com fluxo de caixa inteligente e conciliação automática" },
    { icon: Package, name: "Gestão de Estoque", description: "Controle multi-depósito, curva ABC, sugestões de compra baseadas em demanda" },
    { icon: FileText, name: "Fiscal Integrado", description: "NF-e, NFS-e, CT-e com validação automática e integração SEFAZ" },
    { icon: ClipboardList, name: "Compras e Pedidos", description: "Workflow de aprovação, auditoria de preços e controle de fornecedores" },
    { icon: Users, name: "CRM e Clientes", description: "Gestão completa de clientes com histórico, crédito e análise comportamental" },
    { icon: BarChart3, name: "Relatórios Gerenciais", description: "Dashboards em tempo real com KPIs e insights de IA" },
    { icon: Wrench, name: "Ordens de Serviço", description: "Controle de OS, equipamentos, técnicos e integração com Field Service" },
    { icon: Truck, name: "Logística", description: "Controle de entregas, rastreamento e gestão de transportadoras" }
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

  const benefits = [
    { icon: Clock, title: "Economize Tempo", description: "Automatize tarefas repetitivas e foque no estratégico" },
    { icon: Target, title: "Decisões Precisas", description: "Dados em tempo real para decisões mais assertivas" },
    { icon: Lock, title: "Segurança Total", description: "Dados criptografados e backup automático na nuvem" },
    { icon: Headphones, title: "Suporte Dedicado", description: "Equipe especializada para ajudar sua empresa" }
  ];

  const differentials = [
    {
      icon: Building2,
      title: "Feito para Médias Empresas",
      description: "Interface pensada para operações complexas, com flexibilidade para crescer junto com seu negócio. Sem limitações artificiais."
    },
    {
      icon: LineChart,
      title: "Visão Executiva",
      description: "Dashboards que mostram o que realmente importa. KPIs financeiros, operacionais e de vendas em tempo real."
    },
    {
      icon: Wallet,
      title: "Controle Financeiro Total",
      description: "Integração bancária via API (Inter, Bradesco), DDA automático, pagamento de boletos e PIX direto do sistema."
    },
    {
      icon: Calculator,
      title: "Compliance Fiscal",
      description: "Emissão de notas fiscais com validação automática, cálculo de impostos e integração com contabilidade."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-slate-950/95 backdrop-blur-md shadow-lg border-b border-slate-800" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logoWai} alt="WAI ERP" className="h-10" />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#diferenciais" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Diferenciais</a>
            <a href="#modulos" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Módulos</a>
            <a href="#ia" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Inteligência Artificial</a>
            <a href="#beneficios" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Benefícios</a>
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
              className="bg-primary hover:bg-primary/90 text-white font-semibold"
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
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Powered by Artificial Intelligence</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
              O ERP que{" "}
              <span className="text-primary">pensa</span>
              {" "}junto com você
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Gestão empresarial inteligente para médias empresas. 
              Inteligência Artificial em cada módulo, automatizando processos e antecipando decisões.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white font-semibold text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25"
                onClick={() => navigate("/auth")}
              >
                Acessar o Sistema
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-600 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl"
                onClick={() => document.getElementById("diferenciais")?.scrollIntoView({ behavior: "smooth" })}
              >
                Conhecer Mais
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { value: "95%", label: "Automação de Processos" },
                { value: "24/7", label: "Monitoramento IA" },
                { value: "3x", label: "Mais Produtividade" },
                { value: "100%", label: "Na Nuvem" }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-slate-500" />
        </div>
      </section>

      {/* Differentials Section */}
      <section id="diferenciais" className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold tracking-wider uppercase">Por que escolher o WAI</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-white">
              Um ERP que entende seu negócio
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Desenvolvido para empresas que precisam de mais do que planilhas, 
              mas não querem a complexidade de ERPs tradicionais.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {differentials.map((item) => (
              <Card 
                key={item.title}
                className="bg-slate-800/50 border-slate-700/50 p-8 hover:bg-slate-800/80 transition-all duration-300"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold tracking-wider uppercase">Funcionalidades</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-white">
              IA que transforma sua gestão
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
                className="bg-slate-800/50 border-slate-700/50 p-6 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modulos" className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold tracking-wider uppercase">Módulos Completos</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-white">
              Tudo integrado em um só lugar
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Módulos que conversam entre si, eliminando retrabalho e maximizando sua eficiência operacional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {modules.map((module) => (
              <Card 
                key={module.name}
                className="bg-slate-800/30 border-slate-700/50 p-6 hover:bg-slate-800/60 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-slate-700/50 group-hover:bg-primary/20 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <module.icon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{module.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{module.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ia" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Inteligência Artificial</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-white">
                Uma IA que entende seu negócio
              </h2>
              
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                O WAI ERP não é apenas um sistema de gestão. É um parceiro inteligente que 
                aprende com seus dados, identifica padrões e sugere as melhores decisões 
                para o crescimento sustentável do seu negócio.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {aiFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* AI Chat Preview */}
              <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Assistente WAI</div>
                    <div className="text-xs text-primary">Online • Analisando dados...</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-slate-700/50 rounded-2xl rounded-tl-none p-4 max-w-sm">
                      <p className="text-slate-200 text-sm">
                        Bom dia! Identifiquei que seu fluxo de caixa terá um gap de R$ 15.000 na próxima semana. 
                        Posso sugerir 3 ações para evitar isso?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-tr-none p-4 max-w-sm">
                      <p className="text-white text-sm">
                        Sim, quais são as sugestões?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-slate-700/50 rounded-2xl rounded-tl-none p-4 max-w-sm">
                      <p className="text-slate-200 text-sm mb-3">
                        Baseado nos seus dados, sugiro:
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-primary">
                          <span className="w-5 h-5 bg-primary/30 rounded-full flex items-center justify-center text-xs text-white">1</span>
                          <span className="text-slate-300">Antecipar recebíveis de R$ 8.500</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary">
                          <span className="w-5 h-5 bg-primary/30 rounded-full flex items-center justify-center text-xs text-white">2</span>
                          <span className="text-slate-300">Renegociar fornecedor X (+15 dias)</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary">
                          <span className="w-5 h-5 bg-primary/30 rounded-full flex items-center justify-center text-xs text-white">3</span>
                          <span className="text-slate-300">Ajustar cronograma de compras</span>
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
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold tracking-wider uppercase">Benefícios</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-white">
              Resultados que você pode medir
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Implementação rápida, retorno imediato. Veja como o WAI ERP transforma a operação da sua empresa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-slate-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Confiança</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 text-white">
                Empresas que confiam no WAI
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { metric: "500+", label: "Empresas Ativas", sublabel: "em todo Brasil" },
                { metric: "R$ 2B+", label: "Transacionados", sublabel: "pelo sistema" },
                { metric: "50.000+", label: "NF-e Emitidas", sublabel: "por mês" }
              ].map((item) => (
                <div key={item.label} className="text-center p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                  <div className="text-4xl font-bold text-primary mb-2">{item.metric}</div>
                  <div className="text-lg font-semibold text-white">{item.label}</div>
                  <div className="text-sm text-slate-400">{item.sublabel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <Award className="w-6 h-6 text-primary" />
              <span className="text-primary font-medium">Comece hoje mesmo</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Pronto para ter uma IA gerenciando seu negócio?
            </h2>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Junte-se a centenas de médias empresas que já estão economizando tempo e dinheiro 
              com o WAI ERP. Implementação rápida, suporte dedicado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-slate-900 hover:bg-slate-100 font-semibold text-lg px-10 py-6 rounded-xl shadow-lg"
                onClick={() => navigate("/auth")}
              >
                Acessar o Sistema
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-semibold text-lg px-10 py-6 rounded-xl"
                onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
              >
                Falar com Consultor
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-800 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <img src={logoWai} alt="WAI ERP" className="h-10 mb-4" />
              <p className="text-slate-400 max-w-md leading-relaxed">
                O WAI ERP é a solução completa de gestão empresarial com inteligência artificial 
                para médias empresas que buscam eficiência e crescimento sustentável.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Módulos</h4>
              <ul className="space-y-2 text-slate-400">
                <li>Financeiro</li>
                <li>Estoque</li>
                <li>Fiscal</li>
                <li>Compras</li>
                <li>Vendas</li>
                <li>Ordens de Serviço</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contato</h4>
              <ul className="space-y-2 text-slate-400">
                <li>contato@waierp.com.br</li>
                <li>(11) 99999-9999</li>
                <li>São Paulo, SP</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800">
            <div className="text-slate-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} WAI ERP. Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-6 text-slate-500 text-sm">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
