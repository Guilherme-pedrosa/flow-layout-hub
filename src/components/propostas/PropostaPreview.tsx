import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Proposal, ProposalItem, ProposalTerm, ProposalCompanySettings } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";

// Imagem de capa padrão profissional
const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&q=80";

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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Barra de info */}
      <div className="bg-muted px-4 py-2 text-sm text-muted-foreground flex justify-between">
        <span>Preview da Proposta</span>
        <span>{proposal.numero} • {formatDate(proposal.data_emissao)}</span>
      </div>

      {/* Conteúdo do PDF */}
      <div className="p-8 space-y-8" style={{ minHeight: "800px" }}>
        {/* PÁGINA 1 - CAPA */}
        <div 
          className="relative rounded-lg overflow-hidden min-h-[500px] flex flex-col justify-end"
          style={{
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay com gradiente escuro */}
          <div 
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, ${primaryColor}ee 100%)`
            }}
          />
          
          {/* Conteúdo da capa */}
          <div className="relative z-10 p-8 text-white">
            <h1 className="text-5xl font-bold mb-2 drop-shadow-lg">Proposta</h1>
            <h1 className="text-5xl font-bold mb-8 drop-shadow-lg">Comercial</h1>
            
            <div className="space-y-2 text-base opacity-95">
              <p>
                A seguinte proposta comercial foi elaborada em{" "}
                <strong className="text-white">{formatDate(proposal.data_emissao)}</strong> para{" "}
                <strong className="text-white">{proposal.cliente_nome || "Cliente"}</strong>.
              </p>
              <p>
                A proposta é válida até <strong className="text-white">{formatDate(proposal.data_validade)}</strong>.
              </p>
              <p>
                Número da proposta <strong className="text-white">{proposal.numero}</strong>.
              </p>
            </div>
          </div>

          {/* Rodapé verde com bordas arredondadas */}
          <div 
            className="relative z-10 mx-4 mb-4 p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-10 object-contain bg-white/20 rounded p-1" />
              )}
              <div className="text-white text-sm">
                <p className="font-semibold">{settings?.razao_social || "WeDo Serviços Técnicos"}</p>
                <p className="opacity-90">Tel: {settings?.telefone || "(00) 00000-0000"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Separador de página */}
        <div className="border-t-4 border-dashed border-muted my-8 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-sm text-muted-foreground">
            Página 2
          </span>
        </div>

        {/* PÁGINA 2 - INSTITUCIONAL */}
        <div className="space-y-6">
          {logoUrl && (
            <div className="flex justify-center">
              <img src={logoUrl} alt="Logo" className="h-24 object-contain" />
            </div>
          )}
          
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">{settings?.razao_social || "WeDo Serviços Técnicos"}</h2>
            {settings?.texto_institucional && (
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {settings.texto_institucional}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold" style={{ color: primaryColor }}>Missão</h3>
              <p className="text-muted-foreground">
                {settings?.missao || "Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade."}
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold" style={{ color: primaryColor }}>Visão</h3>
              <p className="text-muted-foreground">
                {settings?.visao || "Ser reconhecida como uma empresa de excelência, qualidade e preço justo."}
              </p>
            </div>
          </div>

          {settings?.valores && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: primaryColor }}>Valores</h3>
              <div className="whitespace-pre-wrap text-muted-foreground">
                {settings.valores}
              </div>
            </div>
          )}
        </div>

        {/* Separador de página */}
        <div className="border-t-4 border-dashed border-muted my-8 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-sm text-muted-foreground">
            Página 3 - Detalhes da Proposta
          </span>
        </div>

        {/* PÁGINA 3 - DETALHES DA PROPOSTA */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
            Detalhes da Proposta
          </h2>
          
          <div className="bg-muted/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">{proposal.titulo}</h3>
            {proposal.descricao_geral && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {proposal.descricao_geral}
              </p>
            )}
          </div>
        </div>

        {/* Separador de página */}
        {items.length > 0 && (
          <>
            <div className="border-t-4 border-dashed border-muted my-8 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-sm text-muted-foreground">
                Página 4 - Itens
              </span>
            </div>

            {/* PÁGINA 4 - ITENS */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
                Os Produtos e Serviços
              </h2>
              <p className="text-muted-foreground">
                Lista de produtos/serviços orçados nesta proposta comercial.
              </p>

              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: primaryColor }}>
                    <th className="text-left p-3 text-white font-medium">Produto</th>
                    <th className="text-center p-3 text-white font-medium w-16">Unid.</th>
                    <th className="text-center p-3 text-white font-medium w-20">Qtde</th>
                    <th className="text-right p-3 text-white font-medium w-28">Valor Unit.</th>
                    <th className="text-right p-3 text-white font-medium w-28">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="p-3">
                        {item.centro_custo && (
                          <span className="font-semibold block">{item.centro_custo}</span>
                        )}
                        <span>{item.descricao}</span>
                        {item.detalhes && (
                          <span className="text-sm text-muted-foreground block mt-1">
                            {item.detalhes}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.unidade}</td>
                      <td className="p-3 text-center">{item.quantidade.toFixed(2)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.valor_unitario)}</td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.quantidade * item.valor_unitario)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div 
                className="p-4 rounded-lg text-right"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <span className="text-lg">Valor total da proposta: </span>
                <span 
                  className="text-2xl font-bold ml-2"
                  style={{ color: primaryColor }}
                >
                  {formatCurrency(totalItens)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Separador de página */}
        {enabledTerms.length > 0 && (
          <>
            <div className="border-t-4 border-dashed border-muted my-8 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-sm text-muted-foreground">
                Página 5 - Termos e Condições
              </span>
            </div>

            {/* PÁGINA 5 - TERMOS */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
                Termos e Condições
              </h2>
              <p className="text-muted-foreground">
                Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
              </p>

              <div className="space-y-4">
                {enabledTerms.map((term) => (
                  <div key={term.id} className="border rounded-lg p-4">
                    <h3 
                      className="font-semibold mb-2"
                      style={{ color: primaryColor }}
                    >
                      {term.titulo}
                    </h3>
                    <div className="text-muted-foreground whitespace-pre-wrap">
                      {term.conteudo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* PÁGINA FINAL - ASSINATURAS */}
        <div className="border-t-4 border-dashed border-muted my-8 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-sm text-muted-foreground">
            Página Final - Assinaturas
          </span>
        </div>

        <div className="space-y-8">
          <p className="text-center text-muted-foreground">
            Estando de acordo com os produtos, valores e termos relatados nesta proposta e por estarem assim justos e contratados,{" "}
            <strong>{settings?.razao_social || "WeDo"}</strong> e o(a){" "}
            <strong>{proposal.cliente_nome || "Cliente"}</strong> firmam a proposta.
          </p>

          <div className="grid grid-cols-2 gap-12 mt-12">
            <div className="text-center">
              <div className="border-t border-foreground pt-4">
                <p className="font-semibold">{settings?.razao_social || "WeDo"}</p>
                <p className="text-sm text-muted-foreground">{settings?.cnpj || "CNPJ"}</p>
                {settings?.nome_assinatura && (
                  <p className="text-sm mt-2">{settings.nome_assinatura}</p>
                )}
                {settings?.cargo_assinatura && (
                  <p className="text-sm text-muted-foreground">{settings.cargo_assinatura}</p>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground pt-4">
                <p className="font-semibold">{proposal.cliente_nome || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{proposal.cliente_cnpj_cpf || "CNPJ/CPF"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div 
          className="mt-12 p-4 rounded-lg flex items-center justify-between text-white text-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 object-contain" />}
            <span>{settings?.razao_social || "WeDo Serviços Técnicos"}</span>
          </div>
          <div className="text-right">
            <span>{proposal.numero}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(proposal.data_emissao)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
