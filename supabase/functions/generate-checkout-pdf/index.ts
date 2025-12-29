import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutItem {
  product_id: string;
  product_code: string;
  product_description: string;
  product_barcode: string | null;
  quantity_total: number;
  quantity_checked: number;
}

interface AuditLog {
  action: string;
  user_name: string;
  created_at: string;
  items_snapshot: any;
  observations: string | null;
}

interface CheckoutData {
  id: string;
  type: 'venda' | 'os';
  number: number;
  client_name: string | null;
  client_cpf_cnpj: string | null;
  client_address: string | null;
  total_value: number;
  checkout_status: string;
  items: CheckoutItem[];
  audit_logs: AuditLog[];
  observations?: string;
}

// Função para formatar data no padrão brasileiro
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Função para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Gera o HTML do PDF
function generatePDFHTML(data: CheckoutData, pdfType: string): string {
  const now = new Date();
  const emissionDate = formatDate(now.toISOString());
  
  // Encontrar logs específicos
  const separadoPor = data.audit_logs.find(l => l.action === 'item_separado' || l.action === 'checkout_iniciado');
  const conferidoPor = data.audit_logs.find(l => l.action === 'item_conferido');
  const finalizadoPor = data.audit_logs.find(l => l.action === 'checkout_finalizado' || l.action === 'checkout_parcial');

  const statusLabel = data.checkout_status === 'completed' ? 'FINALIZADO' : 
                      data.checkout_status === 'partial' ? 'PARCIAL (PRÉVIA)' : 'EM ANDAMENTO (PRÉVIA)';
  
  const isPreview = data.checkout_status !== 'completed';

  let itemsHTML = '';
  
  if (pdfType === 'resumido') {
    // Versão resumida - apenas lista simples
    itemsHTML = data.items.filter(i => i.quantity_checked > 0).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.product_code}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.product_description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity_checked}</td>
      </tr>
    `).join('');
  } else {
    // Versão completa
    itemsHTML = data.items.filter(i => i.quantity_checked > 0).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.product_description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.product_code}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.product_barcode || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity_checked}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">UN</td>
      </tr>
    `).join('');
  }

  // Histórico de operações
  const logsHTML = data.audit_logs.map(log => `
    <tr>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${formatDate(log.created_at)}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${log.action.replace(/_/g, ' ').toUpperCase()}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${log.user_name || 'Sistema'}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${log.observations || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Checkout - ${data.type === 'venda' ? 'Venda' : 'OS'} #${data.number}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #1a1a2e;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header-left {
      flex: 1;
    }
    .header-right {
      text-align: right;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #0ea5e9;
      margin: 0;
    }
    .document-type {
      font-size: 14px;
      color: #64748b;
      margin: 5px 0;
    }
    .document-number {
      font-size: 16px;
      font-weight: bold;
      margin: 5px 0;
    }
    .emission-date {
      font-size: 11px;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin-top: 8px;
    }
    .status-finalizado {
      background-color: #10b981;
      color: white;
    }
    .status-preview {
      background-color: #f59e0b;
      color: white;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #0ea5e9;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .info-item {
      margin-bottom: 5px;
    }
    .info-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 12px;
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background-color: #f1f5f9;
      padding: 10px 8px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    .execution-trail {
      background-color: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .trail-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .trail-label {
      font-weight: 600;
      width: 120px;
      color: #475569;
    }
    .trail-value {
      flex: 1;
    }
    .signature-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .signature-box {
      border: 1px solid #e2e8f0;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .signature-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #475569;
    }
    .signature-line {
      border-bottom: 1px solid #1a1a2e;
      height: 40px;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 10px;
      color: #64748b;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .declaration {
      font-size: 11px;
      color: #475569;
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f8fafc;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    .audit-notice {
      background-color: #fef3c7;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 10px;
      color: #92400e;
      margin-top: 10px;
    }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Cabeçalho -->
    <div class="header">
      <div class="header-left">
        <h1 class="company-name">Ponto a Ponto</h1>
        <p class="document-type">Recibo de Retirada/Entrega de Peças (Checkout)</p>
        <p class="document-number">${data.type === 'venda' ? 'Venda' : 'Ordem de Serviço'} #${data.number}</p>
      </div>
      <div class="header-right">
        <p class="emission-date">Data de Emissão:</p>
        <p style="font-weight: 600; margin: 0;">${emissionDate}</p>
        <span class="status-badge ${isPreview ? 'status-preview' : 'status-finalizado'}">${statusLabel}</span>
      </div>
    </div>

    <!-- Dados do Cliente -->
    <div class="section">
      <h2 class="section-title">Dados do Cliente</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Razão Social / Nome</div>
          <div class="info-value">${data.client_name || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">CNPJ/CPF</div>
          <div class="info-value">${data.client_cpf_cnpj || 'Não informado'}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Endereço</div>
          <div class="info-value">${data.client_address || 'Não informado'}</div>
        </div>
      </div>
    </div>

    <!-- Referência do Processo -->
    <div class="section">
      <h2 class="section-title">Referência do Processo</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">${data.type === 'venda' ? 'Número da Venda' : 'Número da OS'}</div>
          <div class="info-value">#${data.number}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Valor Total</div>
          <div class="info-value">${formatCurrency(data.total_value)}</div>
        </div>
        ${data.observations ? `
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Observações</div>
          <div class="info-value">${data.observations}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Tabela de Itens -->
    <div class="section">
      <h2 class="section-title">Itens Conferidos/Baixados</h2>
      <table>
        <thead>
          <tr>
            ${pdfType === 'resumido' ? `
              <th>Código</th>
              <th>Produto</th>
              <th style="text-align: center;">Qtd</th>
            ` : `
              <th>Produto</th>
              <th>Código Interno</th>
              <th>Código de Barras</th>
              <th style="text-align: center;">Quantidade</th>
              <th style="text-align: center;">Unidade</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    </div>

    <!-- Trilha de Execução -->
    <div class="section">
      <h2 class="section-title">Trilha de Execução (Logs)</h2>
      <div class="execution-trail">
        <div class="trail-item">
          <span class="trail-label">Separado por:</span>
          <span class="trail-value">${separadoPor ? `${separadoPor.user_name} em ${formatDate(separadoPor.created_at)}` : 'Não registrado'}</span>
        </div>
        <div class="trail-item">
          <span class="trail-label">Conferido por:</span>
          <span class="trail-value">${conferidoPor ? `${conferidoPor.user_name} em ${formatDate(conferidoPor.created_at)}` : separadoPor ? `${separadoPor.user_name} (mesmo responsável)` : 'Não registrado'}</span>
        </div>
        <div class="trail-item">
          <span class="trail-label">Finalizado por:</span>
          <span class="trail-value">${finalizadoPor ? `${finalizadoPor.user_name} em ${formatDate(finalizadoPor.created_at)}` : 'Aguardando finalização'}</span>
        </div>
      </div>

      ${data.audit_logs.length > 0 ? `
      <h3 style="font-size: 11px; color: #64748b; margin: 10px 0;">Histórico Completo de Operações</h3>
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Ação</th>
            <th>Usuário</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          ${logsHTML}
        </tbody>
      </table>
      ` : ''}
    </div>

    <!-- Seção de Assinatura -->
    <div class="signature-section">
      <h2 class="section-title">Termo de Recebimento</h2>
      <div class="signature-box">
        <p class="declaration">
          Declaro ter recebido as peças/produtos acima descritos em perfeito estado de conservação,
          conforme conferência realizada. Estou ciente de que qualquer divergência deve ser comunicada
          imediatamente ao responsável pelo setor.
        </p>
        <div class="signature-grid">
          <div>
            <div class="signature-line"></div>
            <div class="signature-label">Nome Completo</div>
          </div>
          <div>
            <div class="signature-line"></div>
            <div class="signature-label">Documento (RG/CPF)</div>
          </div>
          <div>
            <div class="signature-line"></div>
            <div class="signature-label">Data</div>
          </div>
        </div>
        <div style="margin-top: 20px;">
          <div class="signature-line" style="width: 300px;"></div>
          <div class="signature-label">Assinatura do Recebedor</div>
        </div>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <p>ID do Documento: ${data.id}</p>
      <p>Documento gerado automaticamente pelo ERP Ponto a Ponto em ${emissionDate}</p>
      <div class="audit-notice">
        ⚠️ Documento auditável. Alterações somente via estorno registrado em log. 
        Este documento não possui validade fiscal.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log(`[generate-checkout-pdf] Request body:`, JSON.stringify(body));
    
    const { checkoutId, checkoutType: rawCheckoutType, pdfType = 'complete', userId, userName } = body;

    // Normalizar checkoutType: aceitar 'sale'/'service_order' ou 'venda'/'os'
    let checkoutType = rawCheckoutType;
    if (rawCheckoutType === 'sale') checkoutType = 'venda';
    if (rawCheckoutType === 'service_order') checkoutType = 'os';

    console.log(`[generate-checkout-pdf] Normalized: checkoutType=${checkoutType}, checkoutId=${checkoutId}, pdfType=${pdfType}`);

    if (!checkoutId || !checkoutType) {
      return new Response(
        JSON.stringify({ error: 'checkoutId and checkoutType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do checkout (venda ou OS)
    let checkoutData: CheckoutData;

    if (checkoutType === 'venda') {
      console.log(`[generate-checkout-pdf] Fetching sale data...`);
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          id, sale_number, checkout_status, total_value, observations,
          client:clientes(razao_social, nome_fantasia, cpf_cnpj, logradouro, numero, bairro, cidade, estado)
        `)
        .eq('id', checkoutId)
        .single();

      if (saleError) {
        console.error(`[generate-checkout-pdf] Sale fetch error:`, saleError);
        throw saleError;
      }
      console.log(`[generate-checkout-pdf] Sale found:`, sale?.id);

      // Buscar itens
      const { data: items, error: itemsError } = await supabase
        .from('sale_product_items')
        .select(`id, quantity, product_id`)
        .eq('sale_id', checkoutId);

      if (itemsError) {
        console.error(`[generate-checkout-pdf] Items fetch error:`, itemsError);
        throw itemsError;
      }
      console.log(`[generate-checkout-pdf] Found ${items?.length || 0} items`);

      // Buscar produtos separadamente
      const productIds = (items || []).map(i => i.product_id).filter(Boolean);
      const { data: products } = await supabase
        .from('products')
        .select('id, code, description, barcode')
        .in('id', productIds);

      const productsMap: Record<string, any> = {};
      (products || []).forEach(p => {
        productsMap[p.id] = p;
      });

      // Buscar checkout items
      const { data: checkoutItems } = await supabase
        .from('sale_checkout_items')
        .select('sale_product_item_id, quantity_checked')
        .in('sale_product_item_id', items?.map(i => i.id) || []);

      // Buscar movimentações de estoque
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('reference_id', checkoutId)
        .eq('reference_type', 'venda');

      const movementsByProduct: Record<string, number> = {};
      (stockMovements || []).forEach(sm => {
        movementsByProduct[sm.product_id] = (movementsByProduct[sm.product_id] || 0) + sm.quantity;
      });

      const client = sale.client as any;
      const clientAddress = client ? 
        `${client.logradouro || ''}, ${client.numero || ''} - ${client.bairro || ''}, ${client.cidade || ''}/${client.estado || ''}` : 
        null;

      checkoutData = {
        id: sale.id,
        type: 'venda',
        number: sale.sale_number,
        client_name: client?.razao_social || client?.nome_fantasia || null,
        client_cpf_cnpj: client?.cpf_cnpj || null,
        client_address: clientAddress,
        total_value: sale.total_value || 0,
        checkout_status: sale.checkout_status || 'pending',
        observations: sale.observations,
        items: (items || []).map(item => {
          const product = productsMap[item.product_id] || {};
          const checkoutItem = checkoutItems?.find(ci => ci.sale_product_item_id === item.id);
          const quantityFromMovement = movementsByProduct[item.product_id || ''] || 0;
          const quantityChecked = checkoutItem?.quantity_checked || quantityFromMovement;

          return {
            product_id: item.product_id || '',
            product_code: product.code || '',
            product_description: product.description || '',
            product_barcode: product.barcode || null,
            quantity_total: item.quantity,
            quantity_checked: quantityChecked,
          };
        }),
        audit_logs: [],
      };
    } else {
      // OS
      const { data: os, error: osError } = await supabase
        .from('service_orders')
        .select(`
          id, order_number, checkout_status, total_value, observations,
          client:pessoas!service_orders_client_id_fkey(razao_social, nome_fantasia, cpf_cnpj, logradouro, numero, bairro, cidade, estado)
        `)
        .eq('id', checkoutId)
        .single();

      if (osError) throw osError;

      // Buscar itens
      const { data: items, error: itemsError } = await supabase
        .from('service_order_product_items')
        .select(`id, quantity, product_id`)
        .eq('service_order_id', checkoutId);

      if (itemsError) throw itemsError;

      // Buscar produtos separadamente
      const productIds = (items || []).map(i => i.product_id).filter(Boolean);
      const { data: products } = await supabase
        .from('products')
        .select('id, code, description, barcode')
        .in('id', productIds);

      const productsMap: Record<string, any> = {};
      (products || []).forEach(p => {
        productsMap[p.id] = p;
      });

      // Buscar checkout items
      const { data: checkoutItems } = await supabase
        .from('service_order_checkout_items')
        .select('service_order_product_item_id, quantity_checked')
        .in('service_order_product_item_id', items?.map(i => i.id) || []);

      // Buscar movimentações de estoque
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('reference_id', checkoutId)
        .eq('reference_type', 'os');

      const movementsByProduct: Record<string, number> = {};
      (stockMovements || []).forEach(sm => {
        movementsByProduct[sm.product_id] = (movementsByProduct[sm.product_id] || 0) + sm.quantity;
      });

      const client = os.client as any;
      const clientAddress = client ? 
        `${client.logradouro || ''}, ${client.numero || ''} - ${client.bairro || ''}, ${client.cidade || ''}/${client.estado || ''}` : 
        null;

      checkoutData = {
        id: os.id,
        type: 'os',
        number: os.order_number,
        client_name: client?.razao_social || client?.nome_fantasia || null,
        client_cpf_cnpj: client?.cpf_cnpj || null,
        client_address: clientAddress,
        total_value: os.total_value || 0,
        checkout_status: os.checkout_status || 'pending',
        observations: os.observations,
        items: (items || []).map(item => {
          const product = productsMap[item.product_id] || {};
          const checkoutItem = checkoutItems?.find(ci => ci.service_order_product_item_id === item.id);
          const quantityFromMovement = movementsByProduct[item.product_id || ''] || 0;
          const quantityChecked = checkoutItem?.quantity_checked || quantityFromMovement;

          return {
            product_id: item.product_id || '',
            product_code: product.code || '',
            product_description: product.description || '',
            product_barcode: product.barcode || null,
            quantity_total: item.quantity,
            quantity_checked: quantityChecked,
          };
        }),
        audit_logs: [],
      };
    }

    // Buscar logs de auditoria
    const { data: auditLogs } = await supabase
      .from('checkout_audit')
      .select('action, user_name, created_at, items_snapshot, observations')
      .eq('checkout_type', checkoutType)
      .eq('checkout_id', checkoutId)
      .order('created_at', { ascending: true });

    checkoutData.audit_logs = auditLogs || [];

    // Gerar HTML do PDF
    const htmlContent = generatePDFHTML(checkoutData, pdfType);

    // Registrar log de geração do PDF
    await supabase.from('checkout_audit').insert({
      checkout_type: checkoutType,
      checkout_id: checkoutId,
      action: 'pdf_gerado',
      user_id: userId || null,
      user_name: userName || 'Sistema',
      metadata: { pdf_type: pdfType },
    });

    // Buscar próxima versão do PDF
    const { count } = await supabase
      .from('checkout_pdfs')
      .select('*', { count: 'exact', head: true })
      .eq('checkout_type', checkoutType)
      .eq('checkout_id', checkoutId)
      .eq('pdf_type', pdfType);

    const version = (count || 0) + 1;
    const fileName = `checkout_${checkoutType}_${checkoutData.number}_v${version}.html`;

    console.log(`[generate-checkout-pdf] PDF generated successfully, version ${version}`);

    // Retornar o HTML para o frontend gerar o PDF
    // (O frontend usará window.print() ou uma biblioteca como html2pdf)
    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        metadata: {
          checkoutId,
          checkoutType,
          number: checkoutData.number,
          version,
          fileName,
          status: checkoutData.checkout_status,
          itemsCount: checkoutData.items.filter(i => i.quantity_checked > 0).length,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-checkout-pdf] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
