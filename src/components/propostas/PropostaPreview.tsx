import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Proposal, ProposalItem, ProposalTerm, ProposalCompanySettings } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";
import logoWedo from "@/assets/logo-wedo.png";

// Imagem industrial - cozinha profissional em aço inox
const INDUSTRIAL_COVER = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&h=900&fit=crop&q=90";

interface PropostaPreviewProps {
  proposal: Proposal;
  items: ProposalItem[];
  terms: ProposalTerm[];
  settings: ProposalCompanySettings | null | undefined;
}

export function PropostaPreview({ proposal, items, terms, settings }: PropostaPreviewProps) {
  const primaryColor = settings?.primary_color || "#1e3a5f"; // Azul escuro executivo
  const accentColor = "#b4c43d"; // Verde WeDo
  const logoUrl = settings?.logo_url || logoWedo;
  const coverUrl = settings?.cover_image_url || INDUSTRIAL_COVER;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const totalItens = items.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
  const enabledTerms = terms.filter((t) => t.habilitado);

  // Separar termos por categoria
  const termosContratuais = enabledTerms.filter(t => 
    t.titulo.toLowerCase().includes('vigência') ||
    t.titulo.toLowerCase().includes('pagamento') ||
    t.titulo.toLowerCase().includes('cancelamento') ||
    t.titulo.toLowerCase().includes('reajuste') ||
    t.titulo.toLowerCase().includes('sla')
  );
  const outrosTermos = enabledTerms.filter(t => !termosContratuais.includes(t));

  // Header padrão para páginas internas
  const PageHeader = () => (
    <div className="flex items-center justify-between pb-4 mb-6 border-b-2" style={{ borderColor: "#e5e7eb" }}>
      <img src={logoUrl} alt="WeDo" className="h-10 object-contain" />
      <div className="text-right text-sm" style={{ color: "#6b7280" }}>
        <p className="font-semibold" style={{ color: primaryColor }}>{proposal.numero}</p>
        <p>{formatDateShort(proposal.data_emissao)}</p>
      </div>
    </div>
  );

  // Footer padrão
  const PageFooter = ({ pageNumber }: { pageNumber: number }) => (
    <div className="mt-auto pt-6">
      <div className="flex items-center justify-between text-xs" style={{ color: "#6b7280" }}>
        <span>{settings?.razao_social || "WeDo Serviços Técnicos LTDA"}</span>
        <span>Página {pageNumber}</span>
      </div>
      <div className="h-1 mt-2 rounded-full" style={{ backgroundColor: accentColor }} />
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Barra de info do editor */}
      <div className="bg-muted px-4 py-2 text-sm text-muted-foreground flex justify-between print:hidden">
        <span>Preview da Proposta</span>
        <span>{proposal.numero} • {formatDateShort(proposal.data_emissao)}</span>
      </div>

      {/* ========== PÁGINA 1 - CAPA ========== */}
      <div 
        className="relative overflow-hidden"
        style={{ 
          minHeight: "700px",
          pageBreakAfter: "always",
          backgroundColor: primaryColor
        }}
      >
        {/* Imagem de fundo - lateral direita */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/2"
          style={{
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${primaryColor} 0%, transparent 50%)`
            }}
          />
        </div>

        {/* Conteúdo da capa */}
        <div className="relative z-10 h-full flex flex-col p-10" style={{ minHeight: "700px" }}>
          {/* Logo */}
          <div className="mb-auto">
            <img src={logoUrl} alt="WeDo" className="h-16 object-contain" />
          </div>

          {/* Título centralizado */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="max-w-md">
              <p className="text-lg mb-2" style={{ color: accentColor }}>
                Proposta Comercial
              </p>
              <h1 
                className="text-4xl font-bold text-white leading-tight mb-6"
                style={{ letterSpacing: "-0.01em" }}
              >
                {proposal.titulo || "Contrato de Manutenção"}
              </h1>
              
              <div className="h-1 w-20 mb-6" style={{ backgroundColor: accentColor }} />
              
              <div className="space-y-2 text-white/90">
                <p className="text-lg font-semibold text-white">
                  {proposal.cliente_nome || "Cliente"}
                </p>
                <p className="text-sm">
                  {proposal.numero}
                </p>
                <p className="text-sm">
                  {formatDate(proposal.data_emissao)}
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé da capa */}
          <div className="mt-auto pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
            <div className="flex items-center justify-between text-sm text-white/70">
              <div>
                <p>{settings?.razao_social || "WeDo Serviços Técnicos LTDA"}</p>
                <p>CNPJ: {settings?.cnpj || "00.000.000/0001-00"}</p>
              </div>
              <div className="text-right">
                <p>{settings?.telefone || "(11) 0000-0000"}</p>
                <p>{settings?.email || "contato@wedo.com.br"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== PÁGINA 2 - RESUMO EXECUTIVO ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col p-10"
        style={{ pageBreakAfter: "always" }}
      >
        <PageHeader />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
            Resumo Executivo
          </h1>

          <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#374151" }}>
            <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc", borderLeft: `4px solid ${accentColor}` }}>
              <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Objeto do Contrato</h3>
              <p>
                Prestação de serviços técnicos de manutenção preventiva e corretiva em equipamentos 
                de alimentação profissional para {proposal.cliente_nome || "o cliente"}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
                <h4 className="font-semibold text-xs uppercase tracking-wide mb-2" style={{ color: "#6b7280" }}>
                  Contratante
                </h4>
                <p className="font-semibold" style={{ color: primaryColor }}>
                  {proposal.cliente_nome || "—"}
                </p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {proposal.cliente_cnpj_cpf || "—"}
                </p>
              </div>
              <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
                <h4 className="font-semibold text-xs uppercase tracking-wide mb-2" style={{ color: "#6b7280" }}>
                  Contratada
                </h4>
                <p className="font-semibold" style={{ color: primaryColor }}>
                  {settings?.razao_social || "WeDo Serviços Técnicos"}
                </p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {settings?.cnpj || "—"}
                </p>
              </div>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
              <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Escopo Resumido</h3>
              <p className="whitespace-pre-wrap">
                {proposal.descricao_geral || "Serviços de manutenção técnica especializada conforme especificações detalhadas neste documento."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 text-center rounded" style={{ backgroundColor: "#f8fafc" }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#6b7280" }}>Validade</p>
                <p className="font-semibold" style={{ color: primaryColor }}>
                  {formatDateShort(proposal.data_validade)}
                </p>
              </div>
              <div className="p-4 text-center rounded" style={{ backgroundColor: "#f8fafc" }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#6b7280" }}>Itens</p>
                <p className="font-semibold" style={{ color: primaryColor }}>
                  {items.length}
                </p>
              </div>
              <div className="p-4 text-center rounded" style={{ backgroundColor: accentColor }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: primaryColor }}>Valor Total</p>
                <p className="font-bold text-lg" style={{ color: primaryColor }}>
                  {formatCurrency(totalItens)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <PageFooter pageNumber={1} />
      </div>

      {/* ========== PÁGINA 3 - ESCOPO TÉCNICO ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col p-10"
        style={{ pageBreakAfter: "always" }}
      >
        <PageHeader />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
            Escopo Técnico
          </h1>

          <div className="space-y-6 text-sm" style={{ color: "#374151" }}>
            {/* Descrição geral */}
            {proposal.descricao_geral && (
              <div className="mb-6">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {proposal.descricao_geral}
                </p>
              </div>
            )}

            {/* Serviços inclusos */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-3" style={{ color: primaryColor }}>
                Serviços Contemplados
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: accentColor }} />
                  <span>Manutenção preventiva programada</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: accentColor }} />
                  <span>Manutenção corretiva sob demanda</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: accentColor }} />
                  <span>Suporte técnico especializado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: accentColor }} />
                  <span>Relatórios de atendimento e status dos equipamentos</span>
                </li>
              </ul>
            </div>

            {/* Abrangência */}
            <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-2" style={{ color: primaryColor }}>
                Abrangência
              </h3>
              <p>
                Os serviços serão prestados nas instalações do contratante, conforme endereço 
                indicado no cadastro. Atendimentos em localidades distintas deverão ser previamente acordados.
              </p>
            </div>
          </div>
        </div>

        <PageFooter pageNumber={2} />
      </div>

      {/* ========== PÁGINA 4 - EQUIPAMENTOS / ITENS ========== */}
      {items.length > 0 && (
        <div 
          className="relative bg-white min-h-[700px] flex flex-col p-10"
          style={{ pageBreakAfter: "always" }}
        >
          <PageHeader />
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
              Equipamentos e Serviços
            </h1>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
              Detalhamento dos itens contemplados nesta proposta.
            </p>

            {/* Tabela de itens */}
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: primaryColor }}>
                  <th className="text-left py-3 px-3 text-white font-semibold">Descrição</th>
                  <th className="text-center py-3 px-2 text-white font-semibold w-12">Un.</th>
                  <th className="text-center py-3 px-2 text-white font-semibold w-12">Qtd</th>
                  <th className="text-right py-3 px-3 text-white font-semibold w-24">Unit.</th>
                  <th className="text-right py-3 px-3 text-white font-semibold w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr 
                    key={item.id || index} 
                    className="border-b"
                    style={{ 
                      borderColor: "#e5e7eb",
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb"
                    }}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold" style={{ color: primaryColor }}>
                        {item.centro_custo || item.descricao}
                      </div>
                      {item.detalhes && (
                        <div className="text-xs mt-1" style={{ color: "#6b7280" }}>
                          {item.detalhes.substring(0, 100)}{item.detalhes.length > 100 ? "..." : ""}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center" style={{ color: "#6b7280" }}>
                      {item.unidade}
                    </td>
                    <td className="py-3 px-2 text-center" style={{ color: "#6b7280" }}>
                      {item.quantidade.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 text-right" style={{ color: "#6b7280" }}>
                      {formatCurrency(item.valor_unitario)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold" style={{ color: primaryColor }}>
                      {formatCurrency(item.quantidade * item.valor_unitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: accentColor }}>
                  <td colSpan={4} className="py-3 px-3 text-right font-bold" style={{ color: primaryColor }}>
                    VALOR TOTAL
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-lg" style={{ color: primaryColor }}>
                    {formatCurrency(totalItens)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <PageFooter pageNumber={3} />
        </div>
      )}

      {/* ========== PÁGINA 5 - CONDIÇÕES CONTRATUAIS ========== */}
      <div 
        className="relative bg-white min-h-[700px] flex flex-col p-10"
        style={{ pageBreakAfter: "always" }}
      >
        <PageHeader />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
            Condições Contratuais
          </h1>

          <div className="space-y-4 text-sm" style={{ color: "#374151" }}>
            {/* Vigência */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded border" style={{ borderColor: "#e5e7eb" }}>
                <h4 className="font-semibold text-xs uppercase tracking-wide mb-2" style={{ color: "#6b7280" }}>
                  Data de Emissão
                </h4>
                <p className="font-semibold" style={{ color: primaryColor }}>
                  {formatDateShort(proposal.data_emissao)}
                </p>
              </div>
              <div className="p-4 rounded border" style={{ borderColor: "#e5e7eb" }}>
                <h4 className="font-semibold text-xs uppercase tracking-wide mb-2" style={{ color: "#6b7280" }}>
                  Validade da Proposta
                </h4>
                <p className="font-semibold" style={{ color: primaryColor }}>
                  {formatDateShort(proposal.data_validade)}
                </p>
              </div>
            </div>

            {/* Termos contratuais */}
            {termosContratuais.length > 0 ? (
              <div className="space-y-4 mt-6">
                {termosContratuais.map((term) => (
                  <div key={term.id} className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
                    <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>
                      {term.titulo}
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed" style={{ color: "#374151" }}>
                      {term.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Vigência</h3>
                  <p>
                    O contrato terá vigência de 12 (doze) meses, podendo ser renovado 
                    mediante acordo entre as partes.
                  </p>
                </div>
                <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Forma de Pagamento</h3>
                  <p>
                    Pagamento mensal via boleto bancário com vencimento até o dia 10 do mês subsequente.
                  </p>
                </div>
                <div className="p-4 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Reajuste</h3>
                  <p>
                    Os valores serão reajustados anualmente pelo IGPM/FGV ou índice substituto.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <PageFooter pageNumber={4} />
      </div>

      {/* ========== PÁGINA 6 - TERMOS ADICIONAIS (se houver) ========== */}
      {outrosTermos.length > 0 && (
        <div 
          className="relative bg-white min-h-[700px] flex flex-col p-10"
          style={{ pageBreakAfter: "always" }}
        >
          <PageHeader />
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
              Termos e Condições Gerais
            </h1>

            <div className="space-y-4 text-sm" style={{ color: "#374151" }}>
              {outrosTermos.map((term) => (
                <div key={term.id} className="p-4 rounded border-l-2" style={{ backgroundColor: "#f8fafc", borderColor: accentColor }}>
                  <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>
                    {term.titulo}
                  </h3>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {term.conteudo}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <PageFooter pageNumber={5} />
        </div>
      )}

      {/* ========== PÁGINA FINAL - ACEITE ========== */}
      <div className="relative bg-white min-h-[700px] flex flex-col p-10">
        <PageHeader />
        
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: primaryColor }}>
              Aceite da Proposta
            </h1>

            <p className="text-sm text-center mb-10" style={{ color: "#6b7280" }}>
              Para manifestação de interesse e formalização do contrato, 
              solicitamos a assinatura das partes abaixo.
            </p>

            <div className="grid grid-cols-2 gap-12 mt-12">
              {/* Contratada */}
              <div className="text-center">
                <div className="h-20 mb-2" /> {/* Espaço para assinatura */}
                <div className="border-t-2 pt-3" style={{ borderColor: primaryColor }}>
                  <p className="font-semibold text-sm" style={{ color: primaryColor }}>
                    {settings?.razao_social || "WeDo Serviços Técnicos"}
                  </p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>
                    CNPJ: {settings?.cnpj || "—"}
                  </p>
                  {settings?.nome_assinatura && (
                    <p className="text-xs mt-2" style={{ color: "#374151" }}>
                      {settings.nome_assinatura}
                    </p>
                  )}
                  {settings?.cargo_assinatura && (
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      {settings.cargo_assinatura}
                    </p>
                  )}
                </div>
              </div>

              {/* Contratante */}
              <div className="text-center">
                <div className="h-20 mb-2" /> {/* Espaço para assinatura */}
                <div className="border-t-2 pt-3" style={{ borderColor: primaryColor }}>
                  <p className="font-semibold text-sm" style={{ color: primaryColor }}>
                    {proposal.cliente_nome || "Contratante"}
                  </p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>
                    {proposal.cliente_cnpj_cpf || "CPF/CNPJ"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                Local e Data: _________________________________, ____/____/________
              </p>
            </div>
          </div>
        </div>

        <PageFooter pageNumber={outrosTermos.length > 0 ? 6 : 5} />
      </div>
    </div>
  );
}
