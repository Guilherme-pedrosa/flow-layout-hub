import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Proposal, ProposalItem, ProposalTerm, ProposalCompanySettings } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";
import logoWedo from "@/assets/logo-wedo.png";

// Imagens de referência do PDF - cozinha industrial
import refPage1 from "@/assets/proposta-ref-page1.jpg";
import refPage2 from "@/assets/ref-page2.jpg";

interface PropostaPreviewProps {
  proposal: Proposal;
  items: ProposalItem[];
  terms: ProposalTerm[];
  settings: ProposalCompanySettings | null | undefined;
}

export function PropostaPreview({ proposal, items, terms, settings }: PropostaPreviewProps) {
  const greenColor = "#b4c43d"; // Verde WeDo
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
  const totalPages = 12;

  // Footer verde arredondado (igual ao PDF)
  const GreenFooter = ({ pageNumber }: { pageNumber: number }) => (
    <div 
      style={{
        backgroundColor: greenColor,
        borderTopLeftRadius: "40px",
        borderTopRightRadius: "40px",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <img src={logoUrl} alt="WeDo" style={{ height: "28px" }} />
      <span style={{ color: "#1a1a1a", fontSize: "11px" }}>
        {proposal.numero} de {formatDate(proposal.data_emissao)} - página {pageNumber} de {totalPages}
      </span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Barra de info do editor */}
      <div className="bg-muted px-4 py-2 text-sm text-muted-foreground flex justify-between print:hidden">
        <span>Preview da Proposta</span>
        <span>{proposal.numero} • {formatDate(proposal.data_emissao)}</span>
      </div>

      {/* ========== PÁGINA 1 - CAPA ========== */}
      <div 
        className="relative bg-white"
        style={{ 
          minHeight: "800px",
          pageBreakAfter: "always",
          padding: "40px",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <img src={logoUrl} alt="WeDo" style={{ height: "50px" }} />
          <div style={{ 
            backgroundColor: greenColor,
            padding: "8px 20px",
            borderRadius: "4px",
          }}>
            <span style={{ color: "#1a1a1a", fontWeight: 600, fontSize: "13px" }}>
              Proposta Comercial
            </span>
          </div>
        </div>

        {/* Título */}
        <h1 style={{ 
          fontSize: "42px", 
          fontWeight: 900,
          color: "#1a1a1a",
          marginBottom: "20px",
          lineHeight: 1.1,
        }}>
          Proposta<br />Comercial
        </h1>

        {/* Info */}
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "8px" }}>
          A seguinte proposta comercial foi elaborada em {formatDate(proposal.data_emissao)} para {proposal.cliente_nome || "Cliente"}.
        </p>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
          A proposta é válida até {formatDate(proposal.data_validade)}.
        </p>
        <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: 600 }}>
          Número da proposta {proposal.numero}.
        </p>

        {/* Grid de imagens - usando a imagem de referência como fundo */}
        <div 
          style={{ 
            marginTop: "24px",
            height: "320px",
            backgroundImage: `url(${refPage1})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "8px",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "3px",
            overflow: "hidden",
          }}
        >
          {/* Grid overlay para dar o efeito de múltiplas imagens */}
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              style={{
                backgroundColor: "transparent",
                borderRadius: "3px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        {/* Footer verde */}
        <div 
          style={{
            backgroundColor: greenColor,
            borderTopLeftRadius: "40px",
            borderTopRightRadius: "40px",
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <div>
            <p style={{ color: "#1a1a1a", fontSize: "11px", fontWeight: 600 }}>
              {settings?.razao_social || "WeDo Serviços Técnicos Industriais e Comerciais"}
            </p>
            <p style={{ color: "#1a1a1a", fontSize: "10px" }}>WEDO</p>
          </div>
          <p style={{ color: "#1a1a1a", fontSize: "11px" }}>
            Tel: {settings?.telefone || "(62) 99446-6458"}
          </p>
        </div>
      </div>

      {/* ========== PÁGINA 2 - GALERIA ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <div 
          style={{
            height: "100%",
            minHeight: "680px",
            backgroundImage: `url(${refPage2})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "8px",
          }}
        />
        <GreenFooter pageNumber={2} />
      </div>

      {/* ========== PÁGINA 3 - O QUE NOS MOVE ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
          O que nos move?
        </h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "32px" }}>
          Acreditamos em nossa missão e respeitamos os nossos valores.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: greenColor, marginBottom: "12px" }}>
              Visão
            </h2>
            <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.7 }}>
              Ser reconhecida na esfera nacional e internacional como uma empresa de excelência, qualidade e preço justo, em todas as áreas de atuação.
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: greenColor, marginBottom: "12px" }}>
              Missão
            </h2>
            <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.7 }}>
              Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade para resolução de problemas adequados à realidade do processo no qual estivermos inseridos.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: greenColor, marginBottom: "12px" }}>
            Valores
          </h2>
          <ul style={{ color: "#444", fontSize: "13px", lineHeight: 1.8, listStyle: "none", padding: 0 }}>
            <li>• Segurança;</li>
            <li>• Pessoas;</li>
            <li>• Meio Ambiente;</li>
            <li>• Qualidade;</li>
            <li>• Foco no cliente;</li>
            <li>• Melhoria Contínua.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: greenColor, marginBottom: "12px" }}>
            Nossos parceiros
          </h2>
          <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.7 }}>
            O sucesso é resultado da escolha de produtos de alta qualidade. Conheça abaixo os produtos e empresas com os quais trabalhamos.
          </p>
        </div>

        <GreenFooter pageNumber={3} />
      </div>

      {/* ========== PÁGINA 4 - DETALHES DA PROPOSTA ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a", marginBottom: "24px" }}>
          Detalhes da proposta
        </h1>

        <div style={{ 
          backgroundColor: "#f8f9fa",
          borderLeft: `4px solid ${greenColor}`,
          padding: "20px",
          borderRadius: "0 8px 8px 0",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>
            {proposal.titulo || "Manutenções Preventivas e Corretivas"}
          </h2>
          <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {proposal.descricao_geral || `Serviço de manutenção preventiva e corretiva para equipamentos de cozinha industrial, incluindo câmaras frias, fornos inteligentes, coifas, refrigeradores e demais ativos críticos.

As manutenções seguirão cronograma mensal fixo com controle via QR Code e relatórios técnicos digitais, realizados por técnicos qualificados e supervisionados por equipe multidisciplinar da WeDo.

Incluso gestão via plataforma própria, atendimento emergencial com SLA, fornecimento de EPIs e software.`}
          </p>
        </div>

        <GreenFooter pageNumber={4} />
      </div>

      {/* ========== PÁGINA 5 - OS PRODUTOS ========== */}
      {items.length > 0 && (
        <div 
          className="relative bg-white"
          style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
        >
          <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
            Os produtos
          </h1>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "20px" }}>
            Lista de produtos orçados nesta proposta comercial.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ backgroundColor: greenColor }}>
                <th style={{ textAlign: "left", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600 }}>
                  Produto
                </th>
                <th style={{ textAlign: "center", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "45px" }}>
                  Unid.
                </th>
                <th style={{ textAlign: "center", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "50px" }}>
                  Qtde
                </th>
                <th style={{ textAlign: "right", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "90px" }}>
                  Valor unitário
                </th>
                <th style={{ textAlign: "right", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "90px" }}>
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
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "12px" }}>
                      {item.centro_custo || item.descricao}
                    </div>
                    {item.detalhes && (
                      <div style={{ color: "#666", fontSize: "10px", marginTop: "4px" }}>
                        {item.detalhes}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 8px", color: "#666" }}>
                    {item.unidade}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 8px", color: "#666" }}>
                    {item.quantidade.toFixed(2)}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", color: "#666" }}>
                    {formatCurrency(item.valor_unitario)}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#1a1a1a" }}>
                    {formatCurrency(item.quantidade * item.valor_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <GreenFooter pageNumber={5} />
        </div>
      )}

      {/* ========== PÁGINA 6 - VALOR TOTAL ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
          Proposta de Serviço
        </h1>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: greenColor, marginBottom: "20px" }}>
          Serviços
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "32px" }}>
          <thead>
            <tr style={{ backgroundColor: greenColor }}>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600 }}>
                Produto
              </th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "45px" }}>
                Unid.
              </th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "50px" }}>
                Qtde
              </th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "90px" }}>
                Valor unitário
              </th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: "#1a1a1a", fontWeight: 600, width: "90px" }}>
                Valor total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 8px" }}>
                <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "12px" }}>
                  Serviço de manutenção preventiva e corretiva
                </div>
                <div style={{ color: "#666", fontSize: "10px", marginTop: "4px" }}>
                  Conforme escopo detalhado nesta proposta
                </div>
              </td>
              <td style={{ textAlign: "center", padding: "10px 8px", color: "#666" }}>
                SV
              </td>
              <td style={{ textAlign: "center", padding: "10px 8px", color: "#666" }}>
                {items.reduce((sum, item) => sum + item.quantidade, 0).toFixed(2)}
              </td>
              <td style={{ textAlign: "right", padding: "10px 8px", color: "#666" }}>
                —
              </td>
              <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#1a1a1a" }}>
                {formatCurrency(totalItens)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ 
          backgroundColor: greenColor,
          padding: "20px 28px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>
            Valor total da proposta:
          </span>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#1a1a1a" }}>
            {formatCurrency(totalItens)}
          </span>
        </div>

        <GreenFooter pageNumber={6} />
      </div>

      {/* ========== PÁGINA 7 - TERMOS E CONDIÇÕES ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px" }}>
          Termos e Condições
        </h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "20px" }}>
          Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: greenColor }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#1a1a1a", fontWeight: 600, width: "180px" }}>
                Item
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#1a1a1a", fontWeight: 600 }}>
                Descrição
              </th>
            </tr>
          </thead>
          <tbody>
            {enabledTerms.length > 0 ? (
              enabledTerms.map((termo, index) => (
                <tr key={termo.id || index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a", fontSize: "11px" }}>
                    {termo.titulo}
                  </td>
                  <td style={{ padding: "12px", color: "#444", lineHeight: 1.6, fontSize: "11px" }}>
                    {termo.conteudo}
                  </td>
                </tr>
              ))
            ) : (
              <>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                    PREVENTIVA EM CÂMARAS
                  </td>
                  <td style={{ padding: "12px", color: "#444", lineHeight: 1.6 }}>
                    O valor do contrato contempla manutenções trimestrais em fornos inteligentes e semestrais em câmaras frias.
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                    VIGÊNCIA
                  </td>
                  <td style={{ padding: "12px", color: "#444", lineHeight: 1.6 }}>
                    O serviço terá vigência por 12 meses, podendo ser prorrogado de comum acordo entre as partes.
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                    CANCELAMENTO
                  </td>
                  <td style={{ padding: "12px", color: "#444", lineHeight: 1.6 }}>
                    Cancelamentos são isentos de multa com 30 dias de antecedência.
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                    TURNO DE TRABALHO
                  </td>
                  <td style={{ padding: "12px", color: "#444", lineHeight: 1.6 }}>
                    Segunda a sexta-feira, em horário comercial.
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <GreenFooter pageNumber={7} />
      </div>

      {/* ========== PÁGINA 8 - ESCOPO TÉCNICO ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: greenColor }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#1a1a1a", fontWeight: 600, width: "180px" }}>
                Item
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#1a1a1a", fontWeight: 600 }}>
                Descrição
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                ESCOPO TÉCNICO
              </td>
              <td style={{ padding: "12px", color: "#444", lineHeight: 1.7, fontSize: "11px" }}>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  <li>Manutenção preventiva mensal</li>
                  <li>Limpeza de evaporadores e condensadores</li>
                  <li>Aferição de temperaturas</li>
                  <li>Verificação de ruídos e vibrações</li>
                  <li>Reaperto de mancais e conexões elétricas</li>
                  <li>Verificação de termostatos e comandos</li>
                  <li>Verificação de pressões e gás refrigerante</li>
                  <li>Manutenção de fogões e fornos a gás</li>
                  <li>Verificação de tomadas e interruptores</li>
                  <li>Regulagem e limpeza em caldeiras</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
          <p style={{ color: "#444", fontSize: "11px", lineHeight: 1.7 }}>
            <strong>SEM CUSTO Adicional:</strong> Gestor de Operações para atendimento direto ao cliente com poder de decisão.
          </p>
        </div>

        <GreenFooter pageNumber={8} />
      </div>

      {/* ========== PÁGINA 9 - FORNECIMENTO ========== */}
      <div 
        className="relative bg-white"
        style={{ minHeight: "800px", pageBreakAfter: "always", padding: "40px", paddingBottom: "80px" }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: greenColor }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#1a1a1a", fontWeight: 600, width: "180px" }}>
                Item
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#1a1a1a", fontWeight: 600 }}>
                Descrição
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                FORNECIMENTO WEDO
              </td>
              <td style={{ padding: "12px", color: "#444", lineHeight: 1.7 }}>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  <li>Software de controle e relatórios em tempo real</li>
                  <li>Sistema para abertura de chamados</li>
                  <li>Relatórios detalhados de cada serviço</li>
                </ul>
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                FORNECIMENTO CLIENTE
              </td>
              <td style={{ padding: "12px", color: "#444", lineHeight: 1.7 }}>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  <li>EPIs e uniformes</li>
                  <li>Refeições conforme turno</li>
                  <li>Acesso às instalações</li>
                  <li>Área com pontos de energia 220v</li>
                </ul>
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600, color: "#1a1a1a" }}>
                REAJUSTE DE PREÇO
              </td>
              <td style={{ padding: "12px", color: "#444", lineHeight: 1.7 }}>
                Reajuste anual conforme IGPM/FGV ou IPCA/IBGE.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Aceite */}
        <div style={{ marginTop: "32px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <p style={{ color: "#444", fontSize: "11px", lineHeight: 1.7, marginBottom: "20px" }}>
            Estando de acordo com os produtos, valores e termos desta proposta, {settings?.razao_social || "WeDo Serviços Técnicos"} e {proposal.cliente_nome || "Cliente"} firmam a proposta.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginTop: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #1a1a1a", marginBottom: "8px", paddingBottom: "32px" }}></div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#1a1a1a" }}>
                {settings?.razao_social || "WeDo Serviços Técnicos"}
              </p>
              <p style={{ fontSize: "10px", color: "#666" }}>
                {settings?.cnpj || "CNPJ"}
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #1a1a1a", marginBottom: "8px", paddingBottom: "32px" }}></div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#1a1a1a" }}>
                {proposal.cliente_nome || "Contratante"}
              </p>
              <p style={{ fontSize: "10px", color: "#666" }}>
                {proposal.cliente_cnpj_cpf || "CPF/CNPJ"}
              </p>
            </div>
          </div>
        </div>

        <GreenFooter pageNumber={9} />
      </div>

      {/* ========== PÁGINA FINAL - CONTRACAPA ========== */}
      <div 
        className="flex flex-col items-center justify-center"
        style={{ 
          minHeight: "800px",
          backgroundColor: greenColor,
        }}
      >
        <img src={logoUrl} alt="WeDo" style={{ height: "70px", marginBottom: "20px" }} />
        <p style={{ color: "#1a1a1a", fontSize: "13px" }}>
          {settings?.telefone || "(62) 99446-6458"}
        </p>
        <p style={{ color: "#1a1a1a", fontSize: "13px", marginTop: "4px" }}>
          {settings?.email || "contato@wedo.com.br"}
        </p>
      </div>
    </div>
  );
}
