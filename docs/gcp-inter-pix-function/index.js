const https = require('https');

/**
 * Google Cloud Function for Banco Inter PIX payments with mTLS
 * This function receives all data from the Lovable Edge Function
 * No Supabase connection needed - all data is passed in the request
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
    const { 
      // Payment data
      pixKey,
      pixKeyType,
      amount,
      recipientName,
      recipientDocument,
      description,
      // Credentials (passed from Edge Function)
      clientId,
      clientSecret,
      accountNumber,
      // Certificates (passed from Edge Function as base64)
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
    const token = await getOAuthToken({ clientId, clientSecret }, cert, key);
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

  } catch (error) {
    console.error('PIX payment error:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro ao processar pagamento PIX',
      details: error.toString()
    });
  }
};

/**
 * Get OAuth token from Banco Inter using mTLS
 */
async function getOAuthToken(credentials, cert, key) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      scope: 'pagamento-pix.write pagamento-pix.read',
      grant_type: 'client_credentials'
    }).toString();

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
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
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
