import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Proposal, ProposalItem, ProposalTerm, ProposalCompanySettings } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";

// Imagem de capa - cozinha industrial
const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&h=900&fit=crop&q=90";

interface PropostaPreviewProps {
  proposal: Proposal;
  items: ProposalItem[];
  terms: ProposalTerm[];
  settings: ProposalCompanySettings | null | undefined;
}

export function PropostaPreview({ proposal, items, terms, settings }: PropostaPreviewProps) {
  const primaryColor = settings?.primary_color || "#16a34a";
  const logoUrl = settings?.logo_url;
  const coverUrl = settings?.cover_image_url || DEFAULT_COVER_IMAGE;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const totalItens = items.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
  const enabledTerms = terms.filter((t) => t.habilitado);

  // Componente de decoração verde no canto superior direito
  const GreenCornerDecoration = () => (
    <div 
      className="absolute top-0 right-0 w-32 h-32 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div 
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
        style={{ backgroundColor: primaryColor }}
      />
    </div>
  );

  // Componente de rodapé verde arredondado
  const GreenFooter = ({ pageNumber }: { pageNumber?: number }) => (
    <div 
      className="mt-auto pt-8"
      style={{ position: "relative" }}
    >
      <div 
        className="h-12 flex items-center justify-center text-sm"
        style={{ 
          backgroundColor: primaryColor,
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          color: "white"
        }}
      >
        {proposal.numero} de {formatDate(proposal.data_emissao)} - página {pageNumber || ""}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Barra de info do editor */}
      <div className="bg-muted px-4 py-2 text-sm text-muted-foreground flex justify-between print:hidden">
        <span>Preview da Proposta</span>
        <span>{proposal.numero} • {formatDate(proposal.data_emissao)}</span>
      </div>

      {/* ========== PÁGINA 1 - CAPA ========== */}
      <div 
        className="relative overflow-hidden"
        style={{ 
          minHeight: "700px",
          pageBreakAfter: "always"
        }}
      >
        {/* Imagem de fundo */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        
        {/* Overlay escuro */}
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)"
          }}
        />

        {/* Conteúdo da capa */}
        <div className="relative z-10 h-full flex flex-col p-10" style={{ minHeight: "700px" }}>
          {/* Título principal - alinhado à esquerda */}
          <div className="flex-1 flex flex-col justify-start pt-8">
            <h1 
              className="text-7xl font-black text-white leading-none mb-2"
              style={{ 
                fontFamily: "system-ui, -apple-system, sans-serif",
                letterSpacing: "-0.02em"
              }}
            >
              Proposta
            </h1>
            <h2 
              className="text-7xl font-black text-white leading-none"
              style={{ 
                fontFamily: "system-ui, -apple-system, sans-serif",
                letterSpacing: "-0.02em"
              }}
            >
              Comercial
            </h2>

            {/* Informações da proposta */}
            <div className="mt-10 space-y-4 text-white/90 text-lg max-w-md">
              <p>
                A seguinte proposta comercial foi elaborada em{" "}
                <span className="font-semibold text-white">{formatDate(proposal.data_emissao)}</span>{" "}
                para{" "}
                <span className="font-bold text-white">{proposal.cliente_nome || "Cliente"}</span>.
              </p>
              <p>
                A proposta é válida até{" "}
                <span className="font-semibold text-white">{formatDate(proposal.data_validade)}</span>.
              </p>
              <p>
                Número da proposta{" "}
                <span className="font-bold text-white">{proposal.numero}</span>.
              </p>
            </div>
          </div>

          {/* Rodapé da capa com dados da empresa */}
          <div className="mt-auto flex items-end justify-between">
            <div className="text-white">
              <p className="font-semibold text-lg">{settings?.razao_social || "WeDo Serviços Técnicos"}</p>
              <p className="text-white/80 text-sm mt-1">Tel: {settings?.telefone || "(00) 00000-0000"}</p>
            </div>
            {logoUrl ? (
              <div className="bg-white rounded-lg p-3">
                <img src={logoUrl} alt="Logo" className="h-14 object-contain" />
              </div>
            ) : (
              <div 
                className="px-4 py-2 rounded-lg text-white font-bold text-2xl"
                style={{ backgroundColor: primaryColor }}
              >
                WEDO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== PÁGINA 2 - O QUE NOS MOVE ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col"
        style={{ pageBreakAfter: "always" }}
      >
        <GreenCornerDecoration />
        
        <div className="p-10 flex-1">
          <h1 className="text-4xl font-black mb-2">O que nos move?</h1>
          <p className="text-muted-foreground mb-8">
            Acreditamos em nossa missão e respeitamos os nossos valores.
          </p>

          <div className="space-y-6">
            {/* Visão */}
            <div className="border-l-4 pl-6 py-4" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="font-bold text-lg mb-2">Visão</h3>
              <p className="text-muted-foreground text-justify">
                {settings?.visao || "Ser reconhecida na esfera nacional e internacional como uma empresa de excelência, qualidade e preço justo, em todas as áreas de atuação."}
              </p>
            </div>

            {/* Missão */}
            <div className="border-l-4 pl-6 py-4" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="font-bold text-lg mb-2">Missão</h3>
              <p className="text-muted-foreground text-justify">
                {settings?.missao || "Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade para resolução de problemas adequados à realidade do processo no qual estivermos inseridos."}
              </p>
            </div>

            {/* Valores */}
            <div className="border-l-4 pl-6 py-4" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="font-bold text-lg mb-2">Valores</h3>
              <div className="text-muted-foreground space-y-1">
                {(settings?.valores || "Segurança;\nPessoas;\nMeio Ambiente;\nQualidade;\nFoco no cliente;\nMelhoria Contínua.").split('\n').map((valor, idx) => (
                  <p key={idx}>{valor}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Nossos Parceiros */}
          <div className="mt-10">
            <h2 className="text-3xl font-black mb-2">Nossos parceiros</h2>
            <p className="text-muted-foreground">
              O sucesso é resultado da escolha de produtos de alta qualidade. Conheça abaixo os produtos e empresas com os quais trabalhamos.
            </p>
          </div>
        </div>

        <GreenFooter pageNumber={2} />
      </div>

      {/* ========== PÁGINA 3 - DETALHES DA PROPOSTA ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col"
        style={{ pageBreakAfter: "always" }}
      >
        <GreenCornerDecoration />
        
        <div className="p-10 flex-1">
          <h1 className="text-4xl font-black mb-8">Detalhes da proposta</h1>

          <div className="space-y-4">
            <h2 className="text-xl font-bold underline decoration-2 underline-offset-4">
              {proposal.titulo}
            </h2>
            
            {proposal.descricao_geral && (
              <div className="text-muted-foreground text-justify leading-relaxed whitespace-pre-wrap">
                {proposal.descricao_geral}
              </div>
            )}
          </div>
        </div>

        <GreenFooter pageNumber={3} />
      </div>

      {/* ========== PÁGINA 4 - OS PRODUTOS ========== */}
      {items.length > 0 && (
        <div 
          className="relative bg-white min-h-[700px] flex flex-col"
          style={{ pageBreakAfter: "always" }}
        >
          <GreenCornerDecoration />
          
          <div className="p-10 flex-1">
            <h1 className="text-4xl font-black mb-2">Os produtos</h1>
            <p className="text-muted-foreground mb-8">
              Lista de produtos orçados nesta proposta comercial.
            </p>

            {/* Tabela de produtos */}
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: "#e5e7eb" }}>
                  <th className="text-left py-3 font-semibold">Produto</th>
                  <th className="text-center py-3 font-semibold w-16">Unid.</th>
                  <th className="text-center py-3 font-semibold w-16">Qtde</th>
                  <th className="text-right py-3 font-semibold w-28">Valor unitário</th>
                  <th className="text-right py-3 font-semibold w-28">Valor total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index} className="border-b" style={{ borderColor: "#f3f4f6" }}>
                    <td className="py-4">
                      <div className="font-semibold mb-2">
                        {item.centro_custo || item.descricao}
                      </div>
                      {item.detalhes && (
                        <div className="text-sm text-muted-foreground text-justify border-t pt-2" style={{ borderColor: "#e5e7eb" }}>
                          {item.detalhes}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-center align-top">{item.unidade}</td>
                    <td className="py-4 text-center align-top">{item.quantidade.toFixed(2).replace('.', ',')}</td>
                    <td className="py-4 text-right align-top">{formatCurrency(item.valor_unitario)}</td>
                    <td className="py-4 text-right align-top font-semibold">
                      {formatCurrency(item.quantidade * item.valor_unitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <GreenFooter pageNumber={4} />
        </div>
      )}

      {/* ========== PÁGINA 5 - VALOR TOTAL ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col"
        style={{ pageBreakAfter: "always" }}
      >
        <GreenCornerDecoration />
        
        <div className="p-10 flex-1">
          <h1 className="text-4xl font-black mb-2">Proposta de Serviço</h1>
          <h2 className="text-2xl font-bold mb-8">Serviços</h2>

          {/* Resumo da tabela */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "#e5e7eb" }}>
                <th className="text-left py-3 font-semibold">Produto</th>
                <th className="text-center py-3 font-semibold w-16">Unid.</th>
                <th className="text-center py-3 font-semibold w-16">Qtde</th>
                <th className="text-right py-3 font-semibold w-28">Valor unitário</th>
                <th className="text-right py-3 font-semibold w-28">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 3).map((item, index) => (
                <tr key={item.id || index} className="border-b" style={{ borderColor: "#f3f4f6" }}>
                  <td className="py-3 text-sm">{item.descricao?.substring(0, 80)}...</td>
                  <td className="py-3 text-center text-sm">{item.unidade}</td>
                  <td className="py-3 text-center text-sm">{item.quantidade.toFixed(2).replace('.', ',')}</td>
                  <td className="py-3 text-right text-sm">{formatCurrency(item.valor_unitario)}</td>
                  <td className="py-3 text-right text-sm font-semibold">
                    {formatCurrency(item.quantidade * item.valor_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Valor Total */}
          <div className="mt-12">
            <h2 className="text-3xl font-black mb-4">Valor total da proposta:</h2>
            <p 
              className="text-4xl font-black"
              style={{ color: primaryColor }}
            >
              {formatCurrency(totalItens)}
            </p>
          </div>
        </div>

        <GreenFooter pageNumber={5} />
      </div>

      {/* ========== PÁGINA 6 - TERMOS E CONDIÇÕES ========== */}
      {enabledTerms.length > 0 && (
        <div 
          className="relative bg-white min-h-[700px] flex flex-col"
          style={{ pageBreakAfter: "always" }}
        >
          <GreenCornerDecoration />
          
          <div className="p-10 flex-1">
            <h1 className="text-4xl font-black mb-2">Termos e Condições</h1>
            <p className="text-muted-foreground mb-8">
              Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
            </p>

            <div className="space-y-6">
              {enabledTerms.map((term) => (
                <div key={term.id} className="border-l-4 pl-6 py-2" style={{ borderColor: primaryColor }}>
                  <h3 className="font-bold text-lg mb-2">{term.titulo}</h3>
                  <div className="text-muted-foreground text-justify whitespace-pre-wrap">
                    {term.conteudo}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <GreenFooter pageNumber={6} />
        </div>
      )}

      {/* ========== PÁGINA FINAL - ASSINATURAS ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col"
      >
        <GreenCornerDecoration />
        
        <div className="p-10 flex-1 flex flex-col justify-center">
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
            Estando de acordo com os produtos, valores e termos relatados nesta proposta e por estarem assim justos e contratados,{" "}
            <strong className="text-foreground">{settings?.razao_social || "WeDo"}</strong> e o(a){" "}
            <strong className="text-foreground">{proposal.cliente_nome || "Cliente"}</strong> firmam a proposta.
          </p>

          <div className="grid grid-cols-2 gap-16 max-w-2xl mx-auto w-full">
            <div className="text-center">
              <div className="border-t-2 border-foreground pt-4">
                <p className="font-bold">{settings?.razao_social || "WeDo"}</p>
                <p className="text-sm text-muted-foreground">{settings?.cnpj || "CNPJ"}</p>
                {settings?.nome_assinatura && (
                  <p className="text-sm mt-3">{settings.nome_assinatura}</p>
                )}
                {settings?.cargo_assinatura && (
                  <p className="text-sm text-muted-foreground">{settings.cargo_assinatura}</p>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-foreground pt-4">
                <p className="font-bold">{proposal.cliente_nome || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{proposal.cliente_cnpj_cpf || "CNPJ/CPF"}</p>
              </div>
            </div>
          </div>
        </div>

        <GreenFooter pageNumber={7} />
      </div>
    </div>
  );
}
