import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Proposal, ProposalItem, ProposalTerm, ProposalCompanySettings } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";
import logoWedo from "@/assets/logo-wedo.png";

// Imagens industriais REAIS - cozinhas profissionais, equipamentos em aço inox, SEM PESSOAS
const INDUSTRIAL_IMAGES = [
  "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=400&h=300&fit=crop&q=80", // Cozinha industrial aço inox
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop&q=80", // Equipamento profissional
  "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=400&h=300&fit=crop&q=80", // Fogão industrial
  "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=400&h=300&fit=crop&q=80", // Balcão refrigerado
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&q=80", // Utensílios profissionais
  "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=400&h=300&fit=crop&q=80", // Equipamentos cozinha
  "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&h=300&fit=crop&q=80", // Cozinha comercial
  "https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?w=400&h=300&fit=crop&q=80", // Prep station
];

interface PropostaPreviewProps {
  proposal: Proposal;
  items: ProposalItem[];
  terms: ProposalTerm[];
  settings: ProposalCompanySettings | null | undefined;
}

export function PropostaPreview({ proposal, items, terms, settings }: PropostaPreviewProps) {
  const greenColor = "#b4c43d"; // Verde WeDo (cor principal do PDF)
  const logoUrl = settings?.logo_url || logoWedo;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const totalItens = items.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
  const enabledTerms = terms.filter((t) => t.habilitado);

  // Footer verde arredondado padrão (igual ao PDF)
  const GreenFooter = ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
    <div 
      className="mt-auto"
      style={{
        backgroundColor: greenColor,
        borderTopLeftRadius: "50px",
        borderTopRightRadius: "50px",
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: "-40px",
        marginRight: "-40px",
        marginBottom: "-40px",
      }}
    >
      <img src={logoUrl} alt="WeDo" style={{ height: "32px" }} />
      <span style={{ color: "#1a1a1a", fontSize: "12px", fontWeight: 500 }}>
        {proposal.numero} de {formatDate(proposal.data_emissao)} - página {pageNumber} de {totalPages}
      </span>
    </div>
  );

  const totalPages = 7 + (items.length > 0 ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Barra de info do editor */}
      <div className="bg-muted px-4 py-2 text-sm text-muted-foreground flex justify-between print:hidden">
        <span>Preview da Proposta</span>
        <span>{proposal.numero} • {formatDate(proposal.data_emissao)}</span>
      </div>

      {/* ========== PÁGINA 1 - CAPA (IGUAL AO PDF) ========== */}
      <div 
        className="relative bg-white"
        style={{ 
          minHeight: "800px",
          pageBreakAfter: "always",
        }}
      >
        {/* Header com logo e título */}
        <div style={{ padding: "40px 40px 20px 40px" }}>
          <div className="flex items-start justify-between mb-8">
            <img src={logoUrl} alt="WeDo" style={{ height: "60px" }} />
            <div style={{ 
              backgroundColor: greenColor,
              padding: "8px 24px",
              borderRadius: "4px",
            }}>
              <span style={{ color: "#1a1a1a", fontWeight: 600, fontSize: "14px" }}>
                Proposta Comercial
              </span>
            </div>
          </div>

          {/* Título grande */}
          <h1 style={{ 
            fontSize: "48px", 
            fontWeight: 900,
            color: "#1a1a1a",
            marginBottom: "24px",
            lineHeight: 1.1,
          }}>
            Proposta<br />Comercial
          </h1>

          {/* Texto introdutório */}
          <p style={{ color: "#666", fontSize: "14px", maxWidth: "400px", lineHeight: 1.6 }}>
            A seguinte proposta comercial foi elaborada em {formatDate(proposal.data_emissao)} para {proposal.cliente_nome || "Cliente"}.
          </p>
          <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
            A proposta é válida até {formatDate(proposal.data_validade)}.
          </p>
          <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: 600, marginTop: "16px" }}>
            Número da proposta {proposal.numero}.
          </p>
        </div>

        {/* Grid de imagens industriais (IDÊNTICO AO PDF) */}
        <div 
          style={{ 
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(4, 80px)",
            gap: "4px",
            padding: "0 40px",
            marginTop: "20px",
          }}
        >
          {/* Imagens em grid - replicando o padrão do PDF */}
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              style={{
                backgroundImage: `url(${INDUSTRIAL_IMAGES[i % INDUSTRIAL_IMAGES.length]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "4px",
              }}
            />
          ))}
        </div>

        {/* Rodapé da capa */}
        <div 
          style={{ 
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: greenColor,
            borderTopLeftRadius: "50px",
            borderTopRightRadius: "50px",
            padding: "20px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ color: "#1a1a1a", fontSize: "12px", fontWeight: 600 }}>
              {settings?.razao_social || "WeDo Serviços Técnicos Industriais e Comerciais"}
            </p>
            <p style={{ color: "#1a1a1a", fontSize: "11px", marginTop: "2px" }}>
              WEDO
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#1a1a1a", fontSize: "12px" }}>
              Tel: {settings?.telefone || "(62) 99446-6458"}
            </p>
          </div>
        </div>
      </div>

      {/* ========== PÁGINA 2 - GALERIA (igual ao PDF) ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div 
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "8px",
          }}
        >
          {[...Array(16)].map((_, i) => (
            <div 
              key={i}
              style={{
                backgroundImage: `url(${INDUSTRIAL_IMAGES[i % INDUSTRIAL_IMAGES.length]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "8px",
              }}
            />
          ))}
        </div>
        <GreenFooter pageNumber={2} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 3 - O QUE NOS MOVE (Visão, Missão, Valores) ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1">
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
            O que nos move?
          </h1>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "40px" }}>
            Acreditamos em nossa missão e respeitamos os nossos valores.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
            {/* Visão */}
            <div>
              <h2 style={{ 
                fontSize: "24px", 
                fontWeight: 700, 
                color: greenColor,
                marginBottom: "16px",
              }}>
                Visão
              </h2>
              <p style={{ color: "#444", fontSize: "14px", lineHeight: 1.7 }}>
                Ser reconhecida na esfera nacional e internacional como uma empresa de excelência, qualidade e preço justo, em todas as áreas de atuação.
              </p>
            </div>

            {/* Missão */}
            <div>
              <h2 style={{ 
                fontSize: "24px", 
                fontWeight: 700, 
                color: greenColor,
                marginBottom: "16px",
              }}>
                Missão
              </h2>
              <p style={{ color: "#444", fontSize: "14px", lineHeight: 1.7 }}>
                Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade para resolução de problemas adequados à realidade do processo no qual estivermos inseridos.
              </p>
            </div>
          </div>

          {/* Valores */}
          <div style={{ marginTop: "40px" }}>
            <h2 style={{ 
              fontSize: "24px", 
              fontWeight: 700, 
              color: greenColor,
              marginBottom: "16px",
            }}>
              Valores
            </h2>
            <ul style={{ color: "#444", fontSize: "14px", lineHeight: 2 }}>
              <li>• Segurança;</li>
              <li>• Pessoas;</li>
              <li>• Meio Ambiente;</li>
              <li>• Qualidade;</li>
              <li>• Foco no cliente;</li>
              <li>• Melhoria Contínua.</li>
            </ul>
          </div>

          {/* Nossos parceiros */}
          <div style={{ marginTop: "40px" }}>
            <h2 style={{ 
              fontSize: "24px", 
              fontWeight: 700, 
              color: greenColor,
              marginBottom: "16px",
            }}>
              Nossos parceiros
            </h2>
            <p style={{ color: "#444", fontSize: "14px", lineHeight: 1.7 }}>
              O sucesso é resultado da escolha de produtos de alta qualidade. Conheça abaixo os produtos e empresas com os quais trabalhamos.
            </p>
          </div>
        </div>
        <GreenFooter pageNumber={3} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 4 - LOGOS PARCEIROS ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1 flex items-center justify-center">
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "24px",
              padding: "40px",
            }}
          >
            {/* Placeholder para logos de parceiros */}
            {[...Array(16)].map((_, i) => (
              <div 
                key={i}
                style={{
                  width: "100px",
                  height: "60px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ccc",
                  fontSize: "10px",
                }}
              >
                Logo
              </div>
            ))}
          </div>
        </div>
        <GreenFooter pageNumber={4} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 5 - DETALHES DA PROPOSTA ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1">
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#1a1a1a", marginBottom: "32px" }}>
            Detalhes da proposta
          </h1>

          <div style={{ 
            backgroundColor: greenColor + "20",
            borderLeft: `4px solid ${greenColor}`,
            padding: "24px",
            borderRadius: "0 8px 8px 0",
            marginBottom: "24px",
          }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>
              {proposal.titulo || "Manutenções Preventivas e Corretivas"}
            </h2>
            <p style={{ color: "#444", fontSize: "14px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {proposal.descricao_geral || `Serviço de manutenção preventiva e corretiva para equipamentos de cozinha industrial, incluindo câmaras frias, fornos inteligentes, coifas, refrigeradores e demais ativos críticos.

As manutenções seguirão cronograma mensal fixo com controle via QR Code e relatórios técnicos digitais, realizados por técnicos qualificados e supervisionados por equipe multidisciplinar da WeDo.

Incluso gestão via plataforma própria, atendimento emergencial com SLA, fornecimento de EPIs e software.`}
            </p>
          </div>
        </div>
        <GreenFooter pageNumber={5} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 6 - OS PRODUTOS (TABELA) ========== */}
      {items.length > 0 && (
        <div 
          className="relative bg-white flex flex-col"
          style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
        >
          <div className="flex-1">
            <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
              Os produtos
            </h1>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
              Lista de produtos orçados nesta proposta comercial.
            </p>

            {/* Tabela de itens */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: greenColor }}>
                  <th style={{ textAlign: "left", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600 }}>
                    Produto
                  </th>
                  <th style={{ textAlign: "center", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "50px" }}>
                    Unid.
                  </th>
                  <th style={{ textAlign: "center", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "60px" }}>
                    Qtde
                  </th>
                  <th style={{ textAlign: "right", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "100px" }}>
                    Valor unitário
                  </th>
                  <th style={{ textAlign: "right", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "100px" }}>
                    Valor total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr 
                    key={item.id || index}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ fontWeight: 600, color: "#1a1a1a" }}>
                        {item.centro_custo || item.descricao}
                      </div>
                      {item.detalhes && (
                        <div style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>
                          {item.detalhes}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 8px", color: "#666" }}>
                      {item.unidade}
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 8px", color: "#666" }}>
                      {item.quantidade.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", padding: "12px 8px", color: "#666" }}>
                      {formatCurrency(item.valor_unitario)}
                    </td>
                    <td style={{ textAlign: "right", padding: "12px 8px", fontWeight: 600, color: "#1a1a1a" }}>
                      {formatCurrency(item.quantidade * item.valor_unitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <GreenFooter pageNumber={6} totalPages={totalPages} />
        </div>
      )}

      {/* ========== PÁGINA 7 - VALOR TOTAL ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1">
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
            Proposta de Serviço
          </h1>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: greenColor, marginBottom: "24px" }}>
            Serviços
          </h2>

          {/* Resumo da tabela */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "40px" }}>
            <thead>
              <tr style={{ backgroundColor: greenColor }}>
                <th style={{ textAlign: "left", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600 }}>
                  Produto
                </th>
                <th style={{ textAlign: "center", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "50px" }}>
                  Unid.
                </th>
                <th style={{ textAlign: "center", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "60px" }}>
                  Qtde
                </th>
                <th style={{ textAlign: "right", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "100px" }}>
                  Valor unitário
                </th>
                <th style={{ textAlign: "right", padding: "12px 8px", color: "#1a1a1a", fontWeight: 600, width: "100px" }}>
                  Valor total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px 8px" }}>
                  <div style={{ fontWeight: 600, color: "#1a1a1a" }}>
                    Serviço de manutenção preventiva e corretiva
                  </div>
                  <div style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>
                    {proposal.titulo || "Conforme escopo detalhado nesta proposta"}
                  </div>
                </td>
                <td style={{ textAlign: "center", padding: "12px 8px", color: "#666" }}>
                  SV
                </td>
                <td style={{ textAlign: "center", padding: "12px 8px", color: "#666" }}>
                  {items.reduce((sum, item) => sum + item.quantidade, 0).toFixed(2)}
                </td>
                <td style={{ textAlign: "right", padding: "12px 8px", color: "#666" }}>
                  —
                </td>
                <td style={{ textAlign: "right", padding: "12px 8px", fontWeight: 600, color: "#1a1a1a" }}>
                  {formatCurrency(totalItens)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Valor total destacado */}
          <div style={{ 
            backgroundColor: greenColor,
            padding: "24px 32px",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a" }}>
              Valor total da proposta:
            </span>
            <span style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a" }}>
              {formatCurrency(totalItens)}
            </span>
          </div>
        </div>
        <GreenFooter pageNumber={7} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 8 - GALERIA INTERNA ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div 
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: "16px",
          }}
        >
          {INDUSTRIAL_IMAGES.slice(0, 6).map((img, i) => (
            <div 
              key={i}
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "12px",
              }}
            />
          ))}
        </div>
        <GreenFooter pageNumber={8} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 9 - TERMOS E CONDIÇÕES ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1">
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
            Termos e Condições
          </h1>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
            Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
          </p>

          {/* Tabela de termos */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: greenColor }}>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#1a1a1a", fontWeight: 600, width: "200px" }}>
                  Item
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#1a1a1a", fontWeight: 600 }}>
                  Descrição
                </th>
              </tr>
            </thead>
            <tbody>
              {enabledTerms.length > 0 ? (
                enabledTerms.map((termo, index) => (
                  <tr key={termo.id || index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                      {termo.titulo}
                    </td>
                    <td style={{ padding: "16px", color: "#444", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {termo.conteudo}
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                      PREVENTIVA EM CÂMARAS
                    </td>
                    <td style={{ padding: "16px", color: "#444", lineHeight: 1.6 }}>
                      O valor do contrato contempla manutenções trimestrais em fornos inteligentes e semestrais em câmaras frias. As horas demandadas para a atuação em tais serviços serão contabilizadas normalmente conforme contrato.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                      VIGÊNCIA
                    </td>
                    <td style={{ padding: "16px", color: "#444", lineHeight: 1.6 }}>
                      O fornecimento do serviço desta proposta terá início dia {formatDate(proposal.data_emissao)}, e terá vigência por 12 (doze) meses, podendo ser prorrogado de comum acordo entre as partes.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                      CANCELAMENTO
                    </td>
                    <td style={{ padding: "16px", color: "#444", lineHeight: 1.6 }}>
                      Cancelamentos por ambas as partes são isentos de multa, desde que seja avisado com 30 dias de antecedência.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                      TURNO DE TRABALHO
                    </td>
                    <td style={{ padding: "16px", color: "#444", lineHeight: 1.6 }}>
                      O turno de trabalho será de segunda a sexta-feira, em horário comercial, condições que diferem destes termos terão que ser alinhadas entre as partes.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                      HORAS EXTRAORDINÁRIAS
                    </td>
                    <td style={{ padding: "16px", color: "#444", lineHeight: 1.6 }}>
                      Caso seja necessário a realização de visitas emergenciais, a visita subsequente poderá ser adiantada. Caso não seja possível, deverá haver uma negociação prévia para a execução de tal serviço.
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <GreenFooter pageNumber={9} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 10 - ESCOPO TÉCNICO ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1">
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "0" }}>
            <div style={{ 
              backgroundColor: greenColor, 
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}>
              Item
            </div>
            <div style={{ 
              backgroundColor: greenColor, 
              padding: "16px",
              fontWeight: 700,
            }}>
              Descrição
            </div>
            <div style={{ 
              padding: "16px",
              fontWeight: 600,
              borderBottom: "1px solid #e5e7eb",
            }}>
              ESCOPO TÉCNICO
            </div>
            <div style={{ 
              padding: "16px",
              color: "#444",
              fontSize: "13px",
              lineHeight: 1.8,
              borderBottom: "1px solid #e5e7eb",
            }}>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                <li>Elaboração de manutenção preventiva mensal, com todas as revisões e procedimentos com o intuito de manter os equipamentos em devidas condições de uso;</li>
                <li>Limpeza de evaporadores e condensadores;</li>
                <li>Aferição de temperaturas por equipamentos, quente e frio bem como pressão em equipamentos de pressão.</li>
                <li>Verificar e corrigir ruídos e vibrações mecânicas existentes.</li>
                <li>Reaperto de mancais e suportes.</li>
                <li>Verificação de tensões e correntes efetivas.</li>
                <li>Reaperto das conexões elétricas de alimentação e comandos.</li>
                <li>Verificação do comando e termostato de controle.</li>
                <li>Verificar a serpentina quanto a danos físicos e restrições do fluxo de ar.</li>
                <li>Verificar a temperatura do motor de ventilação, testes de atuação e ajustes dos relés térmicos.</li>
                <li>Verificar pressões de compressores e cargas de gás refrigerante.</li>
                <li>Limpeza e manutenção preventiva dos fogões e fornos a gás;</li>
                <li>Verificação e troca de tomadas e interruptores.</li>
                <li>Correção de torque, em conexões e terminais elétricos.</li>
                <li>Aplicar correções com normas e padrões, visando custo e benefício.</li>
                <li>Regulagem e limpeza em fogões e caldeiras;</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.7 }}>
              Para que o trabalho seja executado com todo o padrão de Qualidade, além dos colaboradores acima representados, também serão disponibilizados, <strong>SEM CUSTO</strong> Adicional:
            </p>
            <ul style={{ color: "#444", fontSize: "13px", lineHeight: 1.8, marginTop: "12px", paddingLeft: "20px" }}>
              <li><strong>Gestor de Operações (Sócio da empresa):</strong> É responsável pelo atendimento direto ao cliente, oferecendo soluções Just in time, possibilitando a resolução imediata de diversos problemas, devido ao poder de decisão por parte da contratada.</li>
            </ul>
          </div>
        </div>
        <GreenFooter pageNumber={10} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA 11 - FORNECIMENTO WEDO ========== */}
      <div 
        className="relative bg-white flex flex-col"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px" }}
      >
        <div className="flex-1">
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "0" }}>
            <div style={{ 
              backgroundColor: greenColor, 
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}>
              Item
            </div>
            <div style={{ 
              backgroundColor: greenColor, 
              padding: "16px",
              fontWeight: 700,
            }}>
              Descrição
            </div>
            <div style={{ 
              padding: "16px",
              fontWeight: 600,
              borderBottom: "1px solid #e5e7eb",
            }}>
              FORNECIMENTO WEDO
            </div>
            <div style={{ 
              padding: "16px",
              color: "#444",
              fontSize: "13px",
              lineHeight: 1.8,
              borderBottom: "1px solid #e5e7eb",
            }}>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                <li>Zelo e guarda dos materiais fornecidos pelo cliente;</li>
                <li>Software de controle e lançamento em tempo real de serviços;</li>
                <li>Relatórios detalhados de cada serviço realizado;</li>
                <li>Software para abertura de chamados para o cliente, com acompanhamento das ações;</li>
              </ul>
            </div>
            <div style={{ 
              padding: "16px",
              fontWeight: 600,
              borderBottom: "1px solid #e5e7eb",
            }}>
              FORNECIMENTO CLIENTE
            </div>
            <div style={{ 
              padding: "16px",
              color: "#444",
              fontSize: "13px",
              lineHeight: 1.8,
              borderBottom: "1px solid #e5e7eb",
            }}>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                <li>EPIs completos e em ótimas condições de uso, conforme atividades a serem desenvolvidas.</li>
                <li>Uniformes completos;</li>
                <li>Refeições de acordo com o turno trabalhado (Café da manhã, Almoço, Jantar, Ceia);</li>
                <li>Água potável e banheiros;</li>
                <li>Possibilidade de acesso às instalações elétricas e hidráulicas;</li>
                <li>Acompanhamento técnico quando requisitado;</li>
                <li>Área destinada a execução dos serviços, com disponibilidade de pontos de energia elétrica 220v, interruptores, iluminação;</li>
              </ul>
            </div>
            <div style={{ 
              padding: "16px",
              fontWeight: 600,
              borderBottom: "1px solid #e5e7eb",
            }}>
              REAJUSTE DE PREÇO
            </div>
            <div style={{ 
              padding: "16px",
              color: "#444",
              fontSize: "13px",
              lineHeight: 1.8,
              borderBottom: "1px solid #e5e7eb",
            }}>
              O Preço poderá ser reajustado anualmente conforme os índices IGPM da FGV e IPCA do IBGE ou por outro índice oficial que venha a substituí-lo, ou conforme alinhamento com o cliente.
            </div>
          </div>

          {/* Aceite */}
          <div style={{ marginTop: "40px", padding: "24px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.7, marginBottom: "24px" }}>
              Estando de acordo com os produtos, valores e termos relatados nesta proposta e por estarem assim justos e contratados, {settings?.razao_social || "WeDo Serviços Técnicos Industriais e Comerciais"} e o(a) {proposal.cliente_nome || "Cliente"} firmam a proposta.
            </p>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "40px",
              marginTop: "32px",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #1a1a1a", marginBottom: "8px", paddingBottom: "40px" }}></div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a" }}>
                  {settings?.razao_social || "WeDo Serviços Técnicos"}
                </p>
                <p style={{ fontSize: "11px", color: "#666" }}>
                  {settings?.cnpj || "00.000.000/0001-00"}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #1a1a1a", marginBottom: "8px", paddingBottom: "40px" }}></div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a" }}>
                  {proposal.cliente_nome || "Contratante"}
                </p>
                <p style={{ fontSize: "11px", color: "#666" }}>
                  {proposal.cliente_cnpj_cpf || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <GreenFooter pageNumber={11} totalPages={totalPages} />
      </div>

      {/* ========== PÁGINA FINAL - CONTRACAPA ========== */}
      <div 
        className="relative flex flex-col items-center justify-center"
        style={{ 
          minHeight: "800px",
          backgroundColor: greenColor,
        }}
      >
        <img src={logoUrl} alt="WeDo" style={{ height: "80px", marginBottom: "24px" }} />
        <p style={{ color: "#1a1a1a", fontSize: "14px" }}>
          {settings?.telefone || "(62) 99446-6458"}
        </p>
        <p style={{ color: "#1a1a1a", fontSize: "14px", marginTop: "4px" }}>
          {settings?.email || "contato@wedo.com.br"}
        </p>
      </div>
    </div>
  );
}
