# Google Cloud Function - Banco Inter PIX Payment

Esta Cloud Function processa pagamentos PIX via Banco Inter usando mTLS (mutual TLS).

## Arquitetura Simplificada

A Edge Function do Lovable busca os certificados e credenciais do banco de dados e passa tudo para esta Cloud Function. Assim, esta função NÃO precisa acessar o Supabase diretamente.

## Deploy Passo a Passo

### 1. Acesse o Google Cloud Console

1. Vá para: https://console.cloud.google.com/functions
2. Clique em **"CRIAR FUNÇÃO"**

### 2. Configure a função

**Básico:**
- Nome: `inter-pix-payment`
- Região: `southamerica-east1` (São Paulo)
- Ambiente: `2ª geração`

**Acionador:**
- Tipo: `HTTPS`
- Autenticação: `Permitir invocações não autenticadas`

**Configurações de tempo de execução:**
- Memória: `256 MB`
- Tempo limite: `60 segundos`

### 3. Configure variáveis de ambiente

Clique em **"Variáveis de ambiente, rede, etc."** e adicione:

| Nome | Valor |
|------|-------|
| `FUNCTION_SECRET` | Uma senha forte que você criar (ex: `MinhaSenhaSegura123!@#`) |

**⚠️ IMPORTANTE:** Anote essa senha! Você vai usar ela no Lovable.

### 4. Cole o código

1. Em "Ponto de entrada", escreva: `interPixPayment`
2. Em "Ambiente de execução", selecione: `Node.js 18`
3. No editor, apague tudo e cole o conteúdo do arquivo `index.js`
4. Crie um arquivo `package.json` e cole o conteúdo do arquivo `package.json`

### 5. Faça o deploy

Clique em **"IMPLANTAR"** e aguarde (pode levar 1-2 minutos).

### 6. Copie a URL

Após o deploy, você verá a URL da função. Será algo como:
```
https://southamerica-east1-SEU-PROJETO.cloudfunctions.net/inter-pix-payment
```

## Configurar no Lovable

Depois do deploy, volte no chat do Lovable e me diga:
1. A URL da função que você copiou
2. A senha que você criou para `FUNCTION_SECRET`

Eu vou configurar os secrets automaticamente.

## Testando (Opcional)

```bash
curl -X POST "SUA_URL_AQUI" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_SENHA_AQUI" \
  -d '{
    "pixKey": "email@example.com",
    "pixKeyType": "email",
    "amount": 1.00,
    "recipientName": "Nome Teste",
    "recipientDocument": "12345678901",
    "description": "Teste",
    "clientId": "test",
    "clientSecret": "test",
    "accountNumber": "12345",
    "certificate": "base64...",
    "privateKey": "base64..."
  }'
```
