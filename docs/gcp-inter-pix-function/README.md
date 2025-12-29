# Google Cloud Function - Banco Inter PIX Payment

Esta Cloud Function processa pagamentos PIX via Banco Inter usando mTLS (mutual TLS), que não é suportado pelo Supabase Edge Functions.

## Deploy

### 1. Crie a função no Google Cloud Console

```bash
gcloud functions deploy inter-pix-payment \
  --gen2 \
  --runtime=nodejs18 \
  --region=southamerica-east1 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=interPixPayment \
  --set-env-vars="SUPABASE_URL=https://qxxhwzxxneciskhemqmi.supabase.co,SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY,FUNCTION_SECRET=YOUR_SECRET_HERE"
```

### 2. Configure as variáveis de ambiente

No Google Cloud Console, configure:

- `SUPABASE_URL`: URL do seu projeto Supabase (https://qxxhwzxxneciskhemqmi.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase (encontre em Project Settings > API)
- `FUNCTION_SECRET`: Uma senha segura para autenticar chamadas (gere uma senha forte)

### 3. Anote a URL da função

Após o deploy, você receberá uma URL como:
```
https://southamerica-east1-YOUR_PROJECT.cloudfunctions.net/inter-pix-payment
```

### 4. Configure o secret no Lovable

Adicione o secret `GCP_PIX_FUNCTION_URL` com a URL da sua Cloud Function.
Adicione o secret `GCP_PIX_FUNCTION_SECRET` com a mesma senha usada em `FUNCTION_SECRET`.

## Testando

```bash
curl -X POST "https://YOUR_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FUNCTION_SECRET" \
  -d '{
    "companyId": "your-company-id",
    "pixKey": "email@example.com",
    "pixKeyType": "email",
    "amount": 10.50,
    "recipientName": "Nome Destinatário",
    "recipientDocument": "12345678901",
    "description": "Pagamento teste"
  }'
```

## Segurança

- A função usa autenticação via header `Authorization: Bearer <secret>`
- Os certificados são baixados do Supabase Storage sob demanda
- A chave de serviço do Supabase tem acesso completo - mantenha-a segura
