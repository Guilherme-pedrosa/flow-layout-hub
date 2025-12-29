import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PixPaymentRequest {
  company_id: string;
  payment_id?: string;
  payable_id?: string;
  recipient_name: string;
  recipient_document: string;
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "telefone" | "aleatorio";
  amount: number;
  description?: string;
  is_approval?: boolean;
}

interface InterCredentials {
  client_id: string;
  client_secret: string;
  certificate_file_path: string;
  private_key_file_path: string;
  account_number: string | null;
}

// Helper function to read HTTP response from TLS connection
async function readHttpResponse(conn: Deno.TlsConn): Promise<{ statusCode: number; headers: string; body: string }> {
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(4096);
  let fullResponse = "";
  
  while (true) {
    try {
      const n = await conn.read(buf);
      if (n === null) break;
      
      chunks.push(buf.slice(0, n));
      fullResponse = new TextDecoder().decode(concatUint8Arrays(chunks));
      
      // Check if we have complete headers
      if (fullResponse.includes("\r\n\r\n")) {
        const headerEndIndex = fullResponse.indexOf("\r\n\r\n");
        const headers = fullResponse.substring(0, headerEndIndex);
        const body = fullResponse.substring(headerEndIndex + 4);
        
        // Check Content-Length
        const contentLengthMatch = headers.match(/Content-Length:\s*(\d+)/i);
        if (contentLengthMatch) {
          const contentLength = parseInt(contentLengthMatch[1], 10);
          const bodyBytes = new TextEncoder().encode(body).length;
          if (bodyBytes >= contentLength) break;
        }
        
        // Check for chunked encoding end
        if (headers.toLowerCase().includes("transfer-encoding: chunked")) {
          if (body.includes("0\r\n\r\n") || body.endsWith("0\r\n\r\n")) {
            break;
          }
        }
        
        // For responses without Content-Length, try to detect complete JSON
        if (!contentLengthMatch && body.trim()) {
          const trimmedBody = body.trim();
          if ((trimmedBody.startsWith("{") && trimmedBody.endsWith("}")) ||
              (trimmedBody.startsWith("[") && trimmedBody.endsWith("]"))) {
            try {
              JSON.parse(trimmedBody);
              break;
            } catch {
              // Continue reading
            }
          }
        }
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.log("[inter-pix-payment] Conexão encerrada:", errorMsg);
      break;
    }
  }
  
  // Parse the response
  const headerEndIndex = fullResponse.indexOf("\r\n\r\n");
  if (headerEndIndex === -1) {
    throw new Error(`Resposta HTTP inválida: ${fullResponse.substring(0, 200)}`);
  }
  
  const headers = fullResponse.substring(0, headerEndIndex);
  let body = fullResponse.substring(headerEndIndex + 4);
  
  // Handle chunked encoding
  if (headers.toLowerCase().includes("transfer-encoding: chunked")) {
    body = parseChunkedBody(body);
  }
  
  // Extract status code
  const statusLine = headers.split("\r\n")[0];
  const statusMatch = statusLine.match(/HTTP\/\d\.\d\s+(\d+)/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  
  return { statusCode, headers, body };
}

function parseChunkedBody(chunkedBody: string): string {
  let result = "";
  let remaining = chunkedBody;
  
  while (remaining.length > 0) {
    const lineEnd = remaining.indexOf("\r\n");
    if (lineEnd === -1) break;
    
    const chunkSizeHex = remaining.substring(0, lineEnd).trim();
    const chunkSize = parseInt(chunkSizeHex, 16);
    
    if (chunkSize === 0 || isNaN(chunkSize)) break;
    
    const chunkData = remaining.substring(lineEnd + 2, lineEnd + 2 + chunkSize);
    result += chunkData;
    remaining = remaining.substring(lineEnd + 2 + chunkSize + 2);
  }
  
  return result || chunkedBody;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function normalizePEM(content: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
  let cleaned = content.trim();
  
  // If already in correct PEM format, return as-is
  if (cleaned.includes(`-----BEGIN ${type}-----`) && cleaned.includes(`-----END ${type}-----`)) {
    return cleaned;
  }
  
  // Try to detect pure base64 without headers
  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  if (base64Regex.test(cleaned)) {
    cleaned = cleaned.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,64}/g) || [];
    return `-----BEGIN ${type}-----\n${chunks.join('\n')}\n-----END ${type}-----`;
  }
  
  return cleaned;
}

// Função para obter credenciais e certificados
async function getCredentials(supabase: SupabaseClient, companyId: string): Promise<{
  credentials: InterCredentials;
  cert: string;
  key: string;
}> {
  console.log("[inter-pix-payment] Buscando credenciais para company:", companyId);
  
  const { data: credentials, error: credError } = await supabase
    .from("inter_credentials")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .single();

  if (credError || !credentials) {
    throw new Error("Credenciais do Banco Inter não configuradas ou inativas");
  }

  console.log("[inter-pix-payment] Buscando certificados do storage...");
  
  const [certResult, keyResult] = await Promise.all([
    supabase.storage.from("inter-certs").download(credentials.certificate_file_path),
    supabase.storage.from("inter-certs").download(credentials.private_key_file_path),
  ]);

  if (certResult.error || !certResult.data) {
    throw new Error(`Certificado não encontrado: ${certResult.error?.message}`);
  }
  if (keyResult.error || !keyResult.data) {
    throw new Error(`Chave privada não encontrada: ${keyResult.error?.message}`);
  }

  const cert = normalizePEM(await certResult.data.text(), 'CERTIFICATE');
  const key = normalizePEM(await keyResult.data.text(), 'PRIVATE KEY');

  console.log("[inter-pix-payment] Certificados carregados");
  console.log("[inter-pix-payment] Cert starts with:", cert.substring(0, 50));
  console.log("[inter-pix-payment] Key starts with:", key.substring(0, 50));

  return { credentials, cert, key };
}

// Função para obter token OAuth usando mTLS via Deno.connectTls
async function getOAuthToken(
  credentials: InterCredentials,
  cert: string,
  key: string
): Promise<string> {
  const hostname = "cdpj.partners.bancointer.com.br";
  const port = 443;

  console.log("[inter-pix-payment] Conectando via mTLS para obter token...");

  let conn: Deno.TlsConn;
  try {
    conn = await Deno.connectTls({ 
      hostname, 
      port, 
      cert, 
      key 
    });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("[inter-pix-payment] Erro ao conectar TLS:", errorMsg);
    throw new Error(`Falha na conexão mTLS: ${errorMsg}. Verifique se os certificados estão corretos.`);
  }

  try {
    const body = new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type: "client_credentials",
      scope: "pagamento-pix.write pagamento-pix.read",
    }).toString();

    const request = [
      `POST /oauth/v2/token HTTP/1.1`,
      `Host: ${hostname}`,
      `Content-Type: application/x-www-form-urlencoded`,
      `Content-Length: ${new TextEncoder().encode(body).length}`,
      `Connection: close`,
      "",
      body,
    ].join("\r\n");

    console.log("[inter-pix-payment] Enviando requisição OAuth...");
    await conn.write(new TextEncoder().encode(request));
    
    const { statusCode, body: responseBody } = await readHttpResponse(conn);
    
    console.log("[inter-pix-payment] Status OAuth:", statusCode);

    if (!responseBody) {
      throw new Error("Resposta vazia do servidor OAuth");
    }

    const tokenData = JSON.parse(responseBody);

    if (statusCode !== 200 || !tokenData.access_token) {
      console.error("[inter-pix-payment] Erro OAuth:", JSON.stringify(tokenData));
      throw new Error(`Falha ao obter token: ${tokenData.error_description || tokenData.error || JSON.stringify(tokenData)}`);
    }

    console.log("[inter-pix-payment] Token OAuth obtido com sucesso");
    return tokenData.access_token;
  } finally {
    conn.close();
  }
}

// Função para enviar pagamento PIX usando mTLS via Deno.connectTls
async function sendPixPayment(
  credentials: InterCredentials,
  cert: string,
  key: string,
  token: string,
  payload: PixPaymentRequest
): Promise<{ endToEndId: string; codigoSolicitacao: string; status: string }> {
  const hostname = "cdpj.partners.bancointer.com.br";
  const port = 443;

  console.log("[inter-pix-payment] Conectando via mTLS para enviar PIX...");

  let conn: Deno.TlsConn;
  try {
    conn = await Deno.connectTls({ 
      hostname, 
      port, 
      cert, 
      key 
    });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("[inter-pix-payment] Erro ao conectar TLS para PIX:", errorMsg);
    throw new Error(`Falha na conexão mTLS para PIX: ${errorMsg}`);
  }

  try {
    const pixBody = {
      valor: payload.amount.toFixed(2),
      dataPagamento: new Date().toISOString().split("T")[0],
      descricao: (payload.description || `PIX para ${payload.recipient_name}`).substring(0, 140),
      destinatario: {
        tipo: "CHAVE",
        chave: payload.pix_key,
        contaBanco: {
          cpfCnpj: payload.recipient_document.replace(/\D/g, ""),
          nome: payload.recipient_name,
          tipoConta: "CONTA_CORRENTE",
        },
      },
    };

    const bodyJson = JSON.stringify(pixBody);
    const bodyBytes = new TextEncoder().encode(bodyJson);

    console.log("[inter-pix-payment] Payload PIX:", bodyJson);

    const accountHeader = credentials.account_number 
      ? `x-conta-corrente: ${credentials.account_number}\r\n` 
      : "";

    const request = [
      `POST /banking/v2/pix HTTP/1.1`,
      `Host: ${hostname}`,
      `Authorization: Bearer ${token}`,
      `Content-Type: application/json`,
      `Content-Length: ${bodyBytes.length}`,
      accountHeader ? accountHeader.trim() : null,
      `Connection: close`,
      "",
      bodyJson,
    ].filter(Boolean).join("\r\n");

    console.log("[inter-pix-payment] Enviando requisição PIX...");
    await conn.write(new TextEncoder().encode(request));
    
    const { statusCode, body: responseBody } = await readHttpResponse(conn);
    
    console.log("[inter-pix-payment] Status PIX:", statusCode);
    console.log("[inter-pix-payment] Resposta PIX:", responseBody.substring(0, 500));

    if (!responseBody) {
      throw new Error("Resposta vazia do servidor PIX");
    }

    let result;
    try {
      result = JSON.parse(responseBody);
    } catch (e) {
      console.error("[inter-pix-payment] Erro ao parsear resposta:", responseBody);
      throw new Error(`Resposta inválida do Inter: ${responseBody.substring(0, 200)}`);
    }

    // Status 200 = sucesso, 202 = aceito/aguardando aprovação
    if (statusCode !== 200 && statusCode !== 202) {
      const errorMsg = result.message || result.title || result.error || JSON.stringify(result);
      console.error("[inter-pix-payment] Erro PIX:", errorMsg);
      throw new Error(errorMsg);
    }

    const interStatus = result.status || result.situacao || 
      (statusCode === 202 ? "AGUARDANDO_APROVACAO" : "REALIZADO");

    return {
      endToEndId: result.endToEndId || result.e2eId || null,
      codigoSolicitacao: result.codigoSolicitacao || result.txid || result.id || null,
      status: interStatus,
    };
  } finally {
    conn.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const rawPayload = await req.json();
    let payload: PixPaymentRequest;
    
    // Modo de retry: se receber apenas paymentId, buscar dados do pagamento existente
    if (rawPayload.paymentId && !rawPayload.company_id) {
      console.log(`[inter-pix-payment] Modo retry - buscando pagamento ${rawPayload.paymentId}`);
      
      const { data: existingPayment, error: fetchError } = await supabase
        .from("inter_pix_payments")
        .select("*")
        .eq("id", rawPayload.paymentId)
        .single();
      
      if (fetchError || !existingPayment) {
        throw new Error("Pagamento não encontrado para reprocessamento");
      }
      
      payload = {
        company_id: existingPayment.company_id,
        payment_id: existingPayment.id,
        payable_id: existingPayment.payable_id,
        recipient_name: existingPayment.recipient_name,
        recipient_document: existingPayment.recipient_document,
        pix_key: existingPayment.pix_key,
        pix_key_type: existingPayment.pix_key_type,
        amount: existingPayment.amount,
        description: existingPayment.description,
      };
      
      console.log(`[inter-pix-payment] Dados recuperados para retry: R$ ${payload.amount} para ${payload.recipient_name}`);
    } else {
      payload = rawPayload as PixPaymentRequest;
    }
    
    console.log(`[inter-pix-payment] Processando PIX: R$ ${payload.amount} para ${payload.recipient_name}`);

    if (!payload.company_id || !payload.recipient_name || !payload.pix_key || !payload.amount) {
      throw new Error("Campos obrigatórios: company_id, recipient_name, pix_key, amount");
    }

    if (payload.amount <= 0) {
      throw new Error("O valor deve ser maior que zero");
    }

    // Buscar credenciais e certificados
    const { credentials, cert, key } = await getCredentials(supabase, payload.company_id);

    let paymentId = payload.payment_id;

    if (payload.is_approval && paymentId) {
      await supabase
        .from("inter_pix_payments")
        .update({ status: "processing" })
        .eq("id", paymentId);
    } else if (!paymentId) {
      const { data: payment, error: insertError } = await supabase
        .from("inter_pix_payments")
        .insert({
          company_id: payload.company_id,
          payable_id: payload.payable_id || null,
          recipient_name: payload.recipient_name,
          recipient_document: payload.recipient_document,
          pix_key: payload.pix_key,
          pix_key_type: payload.pix_key_type,
          amount: payload.amount,
          description: payload.description || `PIX para ${payload.recipient_name}`,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[inter-pix-payment] Erro ao criar registro:", insertError);
        throw new Error("Erro ao registrar pagamento");
      }
      
      paymentId = payment.id;
    }

    console.log(`[inter-pix-payment] Pagamento ID: ${paymentId}`);

    try {
      // Obter token OAuth via mTLS
      const token = await getOAuthToken(credentials, cert, key);
      
      // Enviar pagamento PIX via mTLS
      const pixResult = await sendPixPayment(credentials, cert, key, token, payload);

      console.log("[inter-pix-payment] Resultado PIX:", JSON.stringify(pixResult));

      // Mapear status do Inter para status interno
      const isApprovalPending = ["AGUARDANDO_APROVACAO", "PENDENTE", "EM_PROCESSAMENTO", "AGENDADO"].includes(pixResult.status);
      const internalStatus = isApprovalPending ? "pending_approval" : "completed";
      const interStatusFinal = isApprovalPending ? pixResult.status : "REALIZADO";

      await supabase
        .from("inter_pix_payments")
        .update({
          status: internalStatus,
          inter_status: interStatusFinal,
          inter_end_to_end_id: pixResult.endToEndId,
          inter_transaction_id: pixResult.codigoSolicitacao,
          inter_response: pixResult,
          processed_at: isApprovalPending ? null : new Date().toISOString(),
        })
        .eq("id", paymentId);

      // Só marca como pago se foi realizado imediatamente
      if (!isApprovalPending && payload.payable_id) {
        await supabase
          .from("payables")
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            paid_amount: payload.amount,
            payment_method: "pix",
            payment_status: "paid",
          })
          .eq("id", payload.payable_id);
      }

      await supabase.from("audit_logs").insert({
        company_id: payload.company_id,
        action: isApprovalPending ? "pix_payment_pending_approval" : "pix_payment_success",
        entity: "inter_pix_payments",
        entity_id: paymentId,
        metadata_json: {
          amount: payload.amount,
          recipient: payload.recipient_name,
          pix_key: payload.pix_key,
          end_to_end_id: pixResult.endToEndId,
          inter_status: pixResult.status,
        },
      });

      const message = isApprovalPending 
        ? "PIX enviado - aguardando aprovação no Banco Inter" 
        : "PIX enviado com sucesso";

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentId,
          end_to_end_id: pixResult.endToEndId,
          transaction_id: pixResult.codigoSolicitacao,
          status: internalStatus,
          inter_status: pixResult.status,
          message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : "Erro desconhecido";
      console.error("[inter-pix-payment] Erro na API:", errorMsg);

      await supabase
        .from("inter_pix_payments")
        .update({
          status: "failed",
          inter_status: "ERRO",
          error_message: errorMsg,
        })
        .eq("id", paymentId);

      await supabase.from("audit_logs").insert({
        company_id: payload.company_id,
        action: "pix_payment_failed",
        entity: "inter_pix_payments",
        entity_id: paymentId,
        metadata_json: {
          amount: payload.amount,
          recipient: payload.recipient_name,
          error: errorMsg,
        },
      });

      throw new Error(errorMsg);
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-pix-payment] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
