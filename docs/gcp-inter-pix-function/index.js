const https = require('https');

/**
 * Google Cloud Function for Banco Inter operations with mTLS
 * Supports: PIX payments, PIX key validation (DICT lookup), and generic API proxy
 * 
 * IMPORTANTE: A API do Inter exige mTLS em TODAS as chamadas, não apenas na autenticação OAuth!
 */
exports.interPixPayment = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.FUNCTION_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { action } = req.body;

    // Route to appropriate handler
    if (action === 'validate_pix_key') {
      return await handleValidatePixKey(req, res);
    } else if (action === 'proxy') {
      return await handleGenericProxy(req, res);
    } else {
      // Default: PIX payment
      return await handlePixPayment(req, res);
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro ao processar requisição',
      details: error.toString()
    });
  }
};

/**
 * Handle generic API proxy with mTLS
 * CORRIGIDO: Agora envia o certificado mTLS em TODAS as requisições, não apenas OAuth
 */
async function handleGenericProxy(req, res) {
  const { 
    method,
    url,
    headers,
    data,
    clientId,
    clientSecret,
    certificate,
    privateKey,
    accountNumber,
    scope
  } = req.body;

  console.log('Generic proxy request:', { method, url, accountNumber });

  // Validate required fields
  if (!url || !certificate || !privateKey) {
    return res.status(400).json({ error: 'URL, certificado e chave são obrigatórios' });
  }

  // Decode base64 certificates
  let cert, key;
  try {
    cert = Buffer.from(certificate, 'base64').toString('utf-8');
    key = Buffer.from(privateKey, 'base64').toString('utf-8');
    console.log('Certificates decoded successfully, cert length:', cert.length, 'key length:', key.length);
  } catch (e) {
    console.error('Error decoding certificates:', e);
    return res.status(400).json({ error: 'Erro ao decodificar certificados' });
  }

  // If this is an OAuth token request
  if (url.includes('/oauth/v2/token')) {
    try {
      console.log('Processing OAuth token request');
      const token = await getOAuthToken(
        { clientId, clientSecret }, 
        cert, 
        key,
        scope || 'extrato.read'
      );
      return res.status(200).json({ access_token: token, token_type: 'Bearer', scope: scope || 'extrato.read', expires_in: 3600 });
    } catch (error) {
      console.error('OAuth error:', error);
      return res.status(400).json({ _error: true, message: error.message });
    }
  }

  // For other requests (extrato, pix, etc), make the API call with mTLS
  // IMPORTANTE: O certificado DEVE ser enviado em TODAS as chamadas à API do Inter!
  console.log('Processing API request with mTLS:', method, url);
  
  const requestHeaders = { ...headers };
  
  // Ensure x-conta-corrente is set
  if (accountNumber && !requestHeaders['x-conta-corrente']) {
    requestHeaders['x-conta-corrente'] = accountNumber;
  }
  
  console.log('Request headers:', JSON.stringify(requestHeaders));
  console.log('Using mTLS with cert length:', cert.length, 'key length:', key.length);
  
  try {
    const result = await makeProxyRequest(method || 'GET', url, requestHeaders, data, cert, key, accountNumber);
    console.log('Proxy request successful');
    return res.status(200).json(result);
  } catch (error) {
    console.error('Proxy request failed:', error);
    return res.status(400).json({ _error: true, message: error.message });
  }
}

/**
 * Make a generic proxy request with mTLS
 * CORRIGIDO: Garantir que cert e key são usados corretamente
 */
async function makeProxyRequest(method, url, reqHeaders, data, cert, key, accountNumber) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Verificar se cert e key estão presentes
    if (!cert || !key) {
      reject(new Error('Certificado ou chave privada não fornecidos para mTLS'));
      return;
    }
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      cert: cert,  // Certificado para mTLS
      key: key,    // Chave privada para mTLS
      headers: {
        ...reqHeaders,
        'x-conta-corrente': accountNumber || reqHeaders['x-conta-corrente'] || ''
      },
      // Importante: não rejeitar certificados não autorizados durante dev
      rejectUnauthorized: true
    };

    console.log('Making mTLS request:', { 
      hostname: options.hostname, 
      path: options.path, 
      method: options.method,
      hasCert: !!options.cert,
      hasKey: !!options.key,
      certLength: options.cert ? options.cert.length : 0,
      keyLength: options.key ? options.key.length : 0
    });

    const request = https.request(options, (response) => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        console.log('Response status:', response.statusCode);
        console.log('Response body preview:', responseData.substring(0, 500));
        
        try {
          const parsed = JSON.parse(responseData);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
          } else {
            // Return the error as-is so the caller can handle it
            resolve({ 
              _error: true, 
              _statusCode: response.statusCode, 
              ...parsed 
            });
          }
        } catch (e) {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ raw: responseData });
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${responseData}`));
          }
        }
      });
    });

    request.on('error', (e) => {
      console.error('Request error:', e);
      reject(new Error(`Proxy request failed: ${e.message}`));
    });
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const postData = typeof data === 'string' ? data : JSON.stringify(data);
      console.log('Sending data:', postData.substring(0, 200));
      request.write(postData);
    }
    
    request.end();
  });
}

/**
 * Handle PIX key validation (DICT lookup)
 */
async function handleValidatePixKey(req, res) {
  const { 
    clientId,
    clientSecret,
    accountNumber,
    certificate,
    privateKey,
    pixKey,
    pixKeyType
  } = req.body;

  console.log('Validating PIX key:', { pixKey, pixKeyType });

  // Validate required fields
  if (!pixKey || !pixKeyType) {
    return res.status(400).json({ error: 'Chave PIX e tipo são obrigatórios' });
  }

  if (!clientId || !clientSecret || !certificate || !privateKey) {
    return res.status(400).json({ error: 'Credenciais Inter incompletas' });
  }

  // Decode base64 certificates
  const cert = Buffer.from(certificate, 'base64').toString('utf-8');
  const key = Buffer.from(privateKey, 'base64').toString('utf-8');

  // Get OAuth token
  const token = await getOAuthToken(
    { clientId, clientSecret }, 
    cert, 
    key,
    'pix.read'
  );
  console.log('OAuth token obtained for PIX validation');

  // Query DICT
  const result = await queryDict(token, accountNumber, cert, key, pixKey, pixKeyType);
  console.log('DICT lookup result:', result);
  
  return res.status(200).json(result);
}

/**
 * Handle PIX payment
 */
async function handlePixPayment(req, res) {
  const { 
    pixKey,
    pixKeyType,
    amount,
    recipientName,
    recipientDocument,
    description,
    clientId,
    clientSecret,
    accountNumber,
    certificate,
    privateKey
  } = req.body;

  console.log('Processing PIX payment:', { pixKey, amount, recipientName });

  // Validate required fields
  if (!pixKey || !amount || !recipientName || !recipientDocument) {
    return res.status(400).json({ error: 'Dados do pagamento incompletos' });
  }

  if (!clientId || !clientSecret || !certificate || !privateKey) {
    return res.status(400).json({ error: 'Credenciais Inter incompletas' });
  }

  // Decode base64 certificates
  const cert = Buffer.from(certificate, 'base64').toString('utf-8');
  const key = Buffer.from(privateKey, 'base64').toString('utf-8');

  // Get OAuth token
  const token = await getOAuthToken(
    { clientId, clientSecret }, 
    cert, 
    key,
    'pagamento-pix.write pagamento-pix.read'
  );
  console.log('OAuth token obtained successfully');

  // Send PIX payment
  const result = await sendPixPayment(token, accountNumber, cert, key, {
    pixKey,
    pixKeyType,
    amount,
    recipientName,
    recipientDocument,
    description
  });

  console.log('PIX payment result:', result);
  return res.status(200).json(result);
}

/**
 * Get OAuth token from Banco Inter using mTLS
 */
async function getOAuthToken(credentials, cert, key, scope) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      scope: scope || 'pagamento-pix.write pagamento-pix.read',
      grant_type: 'client_credentials'
    }).toString();

    console.log('Getting OAuth token with scope:', scope);

    const options = {
      hostname: 'cdpj.partners.bancointer.com.br',
      port: 443,
      path: '/oauth/v2/token',
      method: 'POST',
      cert: cert,
      key: key,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('OAuth response status:', res.statusCode);
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            console.log('OAuth token obtained, scope:', parsed.scope);
            resolve(parsed.access_token);
          } else {
            reject(new Error(`OAuth error: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse OAuth response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`OAuth request failed: ${e.message}`)));
    req.write(postData);
    req.end();
  });
}

/**
 * Query DICT (PIX key lookup) from Banco Inter using mTLS
 */
async function queryDict(token, accountNumber, cert, key, pixKey, pixKeyType) {
  return new Promise((resolve, reject) => {
    const encodedKey = encodeURIComponent(pixKey);
    
    const options = {
      hostname: 'cdpj.partners.bancointer.com.br',
      port: 443,
      path: `/banking/v2/pix/keys/${encodedKey}`,
      method: 'GET',
      cert: cert,
      key: key,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-conta-corrente': accountNumber || ''
      }
    };

    console.log('DICT lookup request:', options.path);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('DICT response:', res.statusCode, data);
        try {
          const parsed = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Successful lookup
            resolve({
              valid: true,
              name: parsed.nome || parsed.nomeCorrentista || parsed.titular?.nome,
              document: parsed.cpfCnpj || parsed.documento,
              bank: parsed.ispb || parsed.banco || parsed.instituicao,
              keyType: pixKeyType,
              raw: parsed
            });
          } else if (res.statusCode === 404) {
            resolve({
              valid: false,
              error: 'Chave PIX não encontrada'
            });
          } else {
            resolve({
              valid: false,
              error: parsed.message || parsed.erro || `Erro ${res.statusCode}`
            });
          }
        } catch (e) {
          reject(new Error(`Failed to parse DICT response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`DICT request failed: ${e.message}`)));
    req.end();
  });
}

/**
 * Send PIX payment to Banco Inter using mTLS
 */
async function sendPixPayment(token, accountNumber, cert, key, payload) {
  return new Promise((resolve, reject) => {
    // Map PIX key type to Inter API format
    const tipoChaveMap = {
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
      'email': 'EMAIL',
      'telefone': 'TELEFONE',
      'celular': 'TELEFONE',
      'phone': 'TELEFONE',
      'evp': 'CHAVE_ALEATORIA',
      'aleatoria': 'CHAVE_ALEATORIA'
    };

    const pixPayload = {
      valor: payload.amount.toFixed(2),
      destinatario: {
        tipo: payload.recipientDocument.replace(/\D/g, '').length === 11 ? 'FISICA' : 'JURIDICA',
        nome: payload.recipientName,
        contaCorrente: accountNumber
      },
      dataPagamento: new Date().toISOString().split('T')[0],
      chave: payload.pixKey,
      tipoChave: tipoChaveMap[payload.pixKeyType.toLowerCase()] || 'CHAVE_ALEATORIA'
    };

    if (payload.description) {
      pixPayload.descricao = payload.description.substring(0, 140);
    }

    const postData = JSON.stringify(pixPayload);
    console.log('PIX payload:', postData);

    const options = {
      hostname: 'cdpj.partners.bancointer.com.br',
      port: 443,
      path: '/banking/v2/pix',
      method: 'POST',
      cert: cert,
      key: key,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-conta-corrente': accountNumber
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Inter API response:', res.statusCode, data);
        try {
          const parsed = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              transactionId: parsed.codigoSolicitacao || parsed.endToEndId,
              endToEndId: parsed.endToEndId,
              status: parsed.status || 'PROCESSANDO',
              raw: parsed
            });
          } else if (res.statusCode === 202) {
            // Payment pending approval
            resolve({
              success: true,
              pendingApproval: true,
              transactionId: parsed.codigoSolicitacao,
              status: 'PENDENTE_APROVACAO',
              raw: parsed
            });
          } else {
            reject(new Error(`Inter API error (${res.statusCode}): ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Inter response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`PIX request failed: ${e.message}`)));
    req.write(postData);
    req.end();
  });
}
