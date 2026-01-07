import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para formatar data no padrão brasileiro
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

// Função para formatar moeda
function formatCurrency(value: number | null): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

interface DocumentData {
  id: string;
  type: 'venda' | 'os';
  number: number;
  date: string;
  status_name: string;
  status_color: string;
  client_name: string | null;
  client_cpf_cnpj: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  // Valores
  products_total: number;
  services_total: number;
  freight_value: number;
  discount_value: number;
  total_value: number;
  // Pagamento
  payment_type: string;
  installments: number;
  // OS específico
  equipment_type?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_serial?: string;
  reported_issue?: string;
  diagnosis?: string;
  solution?: string;
  // Itens
  product_items: Array<{
    code: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_value: number;
    subtotal: number;
  }>;
  service_items: Array<{
    code: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_value: number;
    subtotal: number;
  }>;
  // Anexos
  attachments: Array<{
    file_name: string;
    file_url: string;
  }>;
  // Logs
  created_by: string | null;
  created_at: string;
  updated_at: string;
  checkout_status: string;
  observations: string | null;
  internal_observations: string | null;
}

// Gera o HTML do PDF para Venda/OS
function generateDocumentHTML(data: DocumentData, pdfType: 'complete' | 'summary'): string {
  const now = new Date();
  const emissionDate = formatDate(now.toISOString());
  const typeLabel = data.type === 'venda' ? 'Venda' : 'Ordem de Serviço';

  const productItemsHTML = data.product_items.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.code}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unit_price)}</td>
      ${pdfType === 'complete' ? `<td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.discount_value)}</td>` : ''}
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');

  const serviceItemsHTML = data.service_items.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.code || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unit_price)}</td>
      ${pdfType === 'complete' ? `<td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.discount_value)}</td>` : ''}
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');

  const paymentTypeLabel = {
    'avista': 'À Vista',
    'parcelado': 'Parcelado',
    'prazo': 'A Prazo',
  }[data.payment_type] || data.payment_type;

  const equipmentSection = data.type === 'os' && (data.equipment_type || data.equipment_brand || data.equipment_model) ? `
    <div class="section">
      <h2 class="section-title">Equipamento</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Tipo</div>
          <div class="info-value">${data.equipment_type || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Marca</div>
          <div class="info-value">${data.equipment_brand || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Modelo</div>
          <div class="info-value">${data.equipment_model || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Nº Série</div>
          <div class="info-value">${data.equipment_serial || '-'}</div>
        </div>
        ${data.reported_issue ? `
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Defeito Relatado</div>
          <div class="info-value">${data.reported_issue}</div>
        </div>
        ` : ''}
        ${data.diagnosis ? `
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Diagnóstico</div>
          <div class="info-value">${data.diagnosis}</div>
        </div>
        ` : ''}
        ${data.solution ? `
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Solução</div>
          <div class="info-value">${data.solution}</div>
        </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel} #${data.number}</title>
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
      border-bottom: 3px solid #0ea5e9;
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
      font-size: 28px;
      font-weight: bold;
      color: #0ea5e9;
      margin: 0;
    }
    .company-tagline {
      font-size: 11px;
      color: #64748b;
      margin: 5px 0 0 0;
    }
    .document-type {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
      margin: 0;
    }
    .document-number {
      font-size: 24px;
      font-weight: bold;
      color: #0ea5e9;
      margin: 5px 0;
    }
    .emission-date {
      font-size: 11px;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 8px;
      color: white;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #0ea5e9;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      margin-bottom: 5px;
    }
    .info-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
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
    .totals-section {
      background-color: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    .totals-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
    }
    .total-item {
      text-align: center;
    }
    .total-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
    }
    .total-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    .total-main {
      font-size: 22px;
      color: #0ea5e9;
    }
    .logs-section {
      background-color: #fefce8;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .log-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .log-label {
      font-weight: 600;
      width: 150px;
      color: #475569;
    }
    .log-value {
      flex: 1;
      color: #1e293b;
    }
    .observations-box {
      background-color: #f1f5f9;
      padding: 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 11px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
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
        <h1 class="company-name">WeDo</h1>
        <p class="company-tagline">ERP Ponto a Ponto</p>
      </div>
      <div class="header-right">
        <p class="document-type">${typeLabel}</p>
        <p class="document-number">#${data.number}</p>
        <p class="emission-date">Data: ${formatDateShort(data.date)}</p>
        <span class="status-badge" style="background-color: ${data.status_color};">${data.status_name}</span>
      </div>
    </div>

    <!-- Dados do Cliente -->
    <div class="section">
      <h2 class="section-title">Cliente</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Razão Social / Nome</div>
          <div class="info-value">${data.client_name || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">CNPJ/CPF</div>
          <div class="info-value">${data.client_cpf_cnpj || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Telefone</div>
          <div class="info-value">${data.client_phone || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">E-mail</div>
          <div class="info-value">${data.client_email || 'Não informado'}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Endereço</div>
          <div class="info-value">${data.client_address || 'Não informado'}</div>
        </div>
      </div>
    </div>

    ${equipmentSection}

    <!-- Produtos -->
    ${data.product_items.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Produtos</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 100px;">Código</th>
            <th>Descrição</th>
            <th style="width: 60px; text-align: center;">Qtd</th>
            <th style="width: 100px; text-align: right;">Valor Unit.</th>
            ${pdfType === 'complete' ? '<th style="width: 80px; text-align: right;">Desconto</th>' : ''}
            <th style="width: 100px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${productItemsHTML}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Serviços -->
    ${data.service_items.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Serviços</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 100px;">Código</th>
            <th>Descrição</th>
            <th style="width: 60px; text-align: center;">Qtd</th>
            <th style="width: 100px; text-align: right;">Valor Unit.</th>
            ${pdfType === 'complete' ? '<th style="width: 80px; text-align: right;">Desconto</th>' : ''}
            <th style="width: 100px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${serviceItemsHTML}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Totais -->
    <div class="totals-section">
      <div class="totals-grid">
        <div class="total-item">
          <div class="total-label">Produtos</div>
          <div class="total-value">${formatCurrency(data.products_total)}</div>
        </div>
        <div class="total-item">
          <div class="total-label">Serviços</div>
          <div class="total-value">${formatCurrency(data.services_total)}</div>
        </div>
        <div class="total-item">
          <div class="total-label">Frete</div>
          <div class="total-value">${formatCurrency(data.freight_value)}</div>
        </div>
        <div class="total-item">
          <div class="total-label">Desconto</div>
          <div class="total-value" style="color: #ef4444;">- ${formatCurrency(data.discount_value)}</div>
        </div>
        <div class="total-item">
          <div class="total-label">Pagamento</div>
          <div class="total-value">${paymentTypeLabel}${data.installments > 1 ? ` (${data.installments}x)` : ''}</div>
        </div>
        <div class="total-item">
          <div class="total-label">Total Geral</div>
          <div class="total-value total-main">${formatCurrency(data.total_value)}</div>
        </div>
      </div>
    </div>

    <!-- Observações -->
    ${data.observations ? `
    <div class="section" style="margin-top: 20px;">
      <h2 class="section-title">Observações</h2>
      <div class="observations-box">${data.observations}</div>
    </div>
    ` : ''}

    <!-- Anexos -->
    ${data.attachments && data.attachments.length > 0 ? `
    <div class="section" style="margin-top: 20px;">
      <h2 class="section-title">Anexos</h2>
      <ul style="margin: 0; padding-left: 20px;">
        ${data.attachments.map((att: { file_name: string; file_url: string }) => `
          <li style="margin-bottom: 8px;">
            <a href="${att.file_url}" target="_blank" style="color: #0ea5e9; text-decoration: underline;">
              ${att.file_name}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Logs/Histórico - apenas no completo -->
    ${pdfType === 'complete' ? `
    <div class="logs-section">
      <h3 style="font-size: 12px; font-weight: 600; margin: 0 0 12px 0; color: #92400e;">Histórico do Documento</h3>
      <div class="log-item">
        <span class="log-label">Criado por:</span>
        <span class="log-value">${data.created_by || 'Sistema'} em ${formatDate(data.created_at)}</span>
      </div>
      <div class="log-item">
        <span class="log-label">Última alteração:</span>
        <span class="log-value">${formatDate(data.updated_at)}</span>
      </div>
      <div class="log-item">
        <span class="log-label">Status atual:</span>
        <span class="log-value">${data.status_name}</span>
      </div>
      ${data.checkout_status && data.checkout_status !== 'none' ? `
      <div class="log-item">
        <span class="log-label">Status Checkout:</span>
        <span class="log-value">${data.checkout_status === 'completed' ? 'Finalizado' : data.checkout_status === 'partial' ? 'Parcial' : 'Pendente'}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Rodapé -->
    <div class="footer">
      <p>ID do Documento: ${data.id}</p>
      <p>Documento gerado automaticamente pelo ERP Ponto a Ponto em ${emissionDate}</p>
      <p>Este documento não possui validade fiscal.</p>
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
    console.log(`[generate-document-pdf] Request:`, JSON.stringify(body));
    
    const { documentId, documentType, pdfType = 'complete' } = body;

    // Normalizar documentType
    let docType = documentType;
    if (documentType === 'sale') docType = 'venda';
    if (documentType === 'service_order') docType = 'os';

    if (!documentId || !docType) {
      return new Response(
        JSON.stringify({ error: 'documentId and documentType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let documentData: DocumentData;

    if (docType === 'venda') {
      console.log(`[generate-document-pdf] Fetching sale...`);
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          id, sale_number, sale_date, checkout_status, total_value, products_total, services_total,
          freight_value, discount_value, payment_type, installments, observations, internal_observations,
          created_at, updated_at,
          client:clientes(razao_social, nome_fantasia, cpf_cnpj, logradouro, numero, bairro, cidade, estado, telefone, email),
          status:sale_statuses(name, color)
        `)
        .eq('id', documentId)
        .single();

      if (saleError) {
        console.error(`[generate-document-pdf] Error:`, saleError);
        throw saleError;
      }

      // Buscar itens de produto
      const { data: productItems } = await supabase
        .from('sale_product_items')
        .select(`
          quantity, unit_price, discount_value, subtotal,
          product:products(code, description)
        `)
        .eq('sale_id', documentId);

      // Buscar itens de serviço
      const { data: serviceItems } = await supabase
        .from('sale_service_items')
        .select(`
          quantity, unit_price, discount_value, subtotal, service_description,
          service:services(code, description)
        `)
        .eq('sale_id', documentId);

      // Buscar anexos
      const { data: attachments } = await supabase
        .from('sale_attachments')
        .select('file_name, file_url')
        .eq('sale_id', documentId);

      const client = sale.client as any;
      const status = sale.status as any;
      const clientAddress = client ? 
        [client.logradouro, client.numero, client.bairro, client.cidade, client.estado].filter(Boolean).join(', ') : 
        null;

      documentData = {
        id: sale.id,
        type: 'venda',
        number: sale.sale_number,
        date: sale.sale_date,
        status_name: status?.name || 'Sem status',
        status_color: status?.color || '#6b7280',
        client_name: client?.razao_social || client?.nome_fantasia || null,
        client_cpf_cnpj: client?.cpf_cnpj || null,
        client_address: clientAddress,
        client_phone: client?.telefone || null,
        client_email: client?.email || null,
        products_total: sale.products_total || 0,
        services_total: sale.services_total || 0,
        freight_value: sale.freight_value || 0,
        discount_value: sale.discount_value || 0,
        total_value: sale.total_value || 0,
        payment_type: sale.payment_type || 'avista',
        installments: sale.installments || 1,
        created_by: null,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
        checkout_status: sale.checkout_status || 'none',
        observations: sale.observations,
        internal_observations: sale.internal_observations,
        attachments: (attachments || []).map((a: any) => ({
          file_name: a.file_name,
          file_url: a.file_url,
        })),
        product_items: (productItems || []).map((item: any) => ({
          code: item.product?.code || '',
          description: item.product?.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_value: item.discount_value || 0,
          subtotal: item.subtotal,
        })),
        service_items: (serviceItems || []).map((item: any) => ({
          code: item.service?.code || '',
          description: item.service?.description || item.service_description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_value: item.discount_value || 0,
          subtotal: item.subtotal,
        })),
      };

    } else {
      // OS
      console.log(`[generate-document-pdf] Fetching service order...`);
      
      const { data: os, error: osError } = await supabase
        .from('service_orders')
        .select(`
          id, order_number, order_date, checkout_status, total_value, products_total, services_total,
          freight_value, discount_value, payment_type, installments, observations, internal_observations,
          equipment_type, equipment_brand, equipment_model, equipment_serial, reported_issue, diagnosis, solution,
          created_at, updated_at,
          client:pessoas!service_orders_client_id_fkey(razao_social, nome_fantasia, cpf_cnpj, logradouro, numero, bairro, cidade, estado, telefone, email),
          status:service_order_statuses(name, color)
        `)
        .eq('id', documentId)
        .single();

      if (osError) {
        console.error(`[generate-document-pdf] Error:`, osError);
        throw osError;
      }

      // Buscar itens de produto
      const { data: productItems } = await supabase
        .from('service_order_product_items')
        .select(`
          quantity, unit_price, discount_value, subtotal,
          product:products(code, description)
        `)
        .eq('service_order_id', documentId);

      // Buscar itens de serviço
      const { data: serviceItems } = await supabase
        .from('service_order_service_items')
        .select(`
          quantity, unit_price, discount_value, subtotal, service_description,
          service:services(code, description)
        `)
        .eq('service_order_id', documentId);

      const client = os.client as any;
      const status = os.status as any;
      const clientAddress = client ? 
        [client.logradouro, client.numero, client.bairro, client.cidade, client.estado].filter(Boolean).join(', ') : 
        null;

      documentData = {
        id: os.id,
        type: 'os',
        number: os.order_number,
        date: os.order_date,
        status_name: status?.name || 'Sem status',
        status_color: status?.color || '#6b7280',
        client_name: client?.razao_social || client?.nome_fantasia || null,
        client_cpf_cnpj: client?.cpf_cnpj || null,
        client_address: clientAddress,
        client_phone: client?.telefone || null,
        client_email: client?.email || null,
        products_total: os.products_total || 0,
        services_total: os.services_total || 0,
        freight_value: os.freight_value || 0,
        discount_value: os.discount_value || 0,
        total_value: os.total_value || 0,
        payment_type: os.payment_type || 'avista',
        installments: os.installments || 1,
        equipment_type: os.equipment_type,
        equipment_brand: os.equipment_brand,
        equipment_model: os.equipment_model,
        equipment_serial: os.equipment_serial,
        reported_issue: os.reported_issue,
        diagnosis: os.diagnosis,
        solution: os.solution,
        created_by: null,
        created_at: os.created_at,
        updated_at: os.updated_at,
        checkout_status: os.checkout_status || 'none',
        observations: os.observations,
        internal_observations: os.internal_observations,
        attachments: [], // OS não tem anexos por enquanto
        product_items: (productItems || []).map((item: any) => ({
          code: item.product?.code || '',
          description: item.product?.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_value: item.discount_value || 0,
          subtotal: item.subtotal,
        })),
        service_items: (serviceItems || []).map((item: any) => ({
          code: item.service?.code || '',
          description: item.service?.description || item.service_description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_value: item.discount_value || 0,
          subtotal: item.subtotal,
        })),
      };
    }

    // Gerar HTML do PDF
    const htmlContent = generateDocumentHTML(documentData, pdfType as 'complete' | 'summary');
    console.log(`[generate-document-pdf] PDF generated for ${docType} #${documentData.number}`);

    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        metadata: {
          documentId,
          documentType: docType,
          number: documentData.number,
          status: documentData.status_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-document-pdf] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
