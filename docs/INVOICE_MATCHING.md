# Cruzamento de Faturas com Lançamentos Financeiros

## Visão Geral

Esta funcionalidade permite importar faturas/boletos em PDF e cruzar automaticamente com os lançamentos no contas a pagar, facilitando a conciliação financeira.

## Tecnologias Utilizadas

- **Docling** (IBM): Biblioteca de processamento de documentos com IA
- **Python 3.11**: Backend para extração e processamento
- **Flask**: API REST para integração
- **Supabase**: Banco de dados e autenticação

## Funcionalidades

### 1. Extração de Dados de PDF

O sistema extrai automaticamente:

| Campo | Descrição |
|-------|-----------|
| `valor_total` | Valor da fatura/boleto |
| `data_vencimento` | Data de vencimento |
| `data_emissao` | Data de emissão |
| `beneficiario_nome` | Nome do fornecedor/beneficiário |
| `beneficiario_cnpj` | CNPJ do fornecedor |
| `codigo_barras` | Código de barras do boleto (47-48 dígitos) |
| `linha_digitavel` | Linha digitável do boleto |
| `nosso_numero` | Nosso número do documento |
| `numero_documento` | Número da fatura/NF |

### 2. Tipos de Documentos Suportados

- **Boletos bancários**
- **Faturas de serviços**
- **Notas fiscais (DANFE em PDF)**
- **Recibos e comprovantes**

### 3. Algoritmo de Cruzamento

O sistema usa um algoritmo de pontuação para encontrar correspondências:

| Critério | Pontuação |
|----------|-----------|
| CNPJ do fornecedor confere | +40 pontos |
| Valor exato | +30 pontos |
| Valor aproximado (< R$ 1,00 de diferença) | +20 pontos |
| Data de vencimento confere | +20 pontos |
| Número do documento confere | +10 pontos |

**Classificação:**
- **Match Exato**: ≥ 70 pontos → Conciliação automática
- **Match Parcial**: 40-69 pontos → Revisão manual
- **Sem Match**: < 40 pontos → Criar novo lançamento

### 4. Ações Sugeridas

| Ação | Quando |
|------|--------|
| `CONCILIAR_AUTOMATICO` | 1 match exato encontrado |
| `SELECIONAR_MATCH` | Múltiplos matches exatos |
| `REVISAR_MANUAL` | Apenas matches parciais |
| `CRIAR_NOVO_LANCAMENTO` | Nenhum match encontrado |

---

## API Endpoints

### `POST /extract`

Extrai dados de um PDF.

**Request (multipart/form-data):**
```
file: arquivo.pdf
```

**Request (JSON):**
```json
{
  "text": "texto do documento",
  // ou
  "base64": "base64_do_pdf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document_type": "boleto",
    "valor_total": 1500.00,
    "data_vencimento": "2024-12-31",
    "beneficiario_nome": "Fornecedor ABC",
    "beneficiario_cnpj": "12345678000190",
    "codigo_barras": "23793381286000000000300000000401184340000150000",
    "confidence_score": 0.9
  }
}
```

---

### `POST /match`

Cruza dados extraídos com lançamentos financeiros.

**Request:**
```json
{
  "company_id": "uuid-da-empresa",
  "extracted_data": { ... },
  "filters": {
    "min_date": "2024-01-01",
    "max_date": "2024-12-31",
    "min_amount": 100,
    "max_amount": 10000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exact_matches": [
      {
        "payable": {
          "id": "uuid",
          "supplier_name": "Fornecedor ABC",
          "amount": 1500.00,
          "due_date": "2024-12-31"
        },
        "score": 100,
        "details": ["CNPJ confere", "Valor exato", "Vencimento confere"],
        "divergences": []
      }
    ],
    "partial_matches": [],
    "suggested_action": "CONCILIAR_AUTOMATICO",
    "total_payables_checked": 50
  }
}
```

---

### `POST /reconcile`

Concilia um lançamento com os dados extraídos.

**Request:**
```json
{
  "payable_id": "uuid-do-lancamento",
  "extracted_data": { ... },
  "action": "confirm"  // ou "update_and_confirm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conta a pagar conciliada com sucesso",
  "payable_id": "uuid"
}
```

---

### `POST /analyze-batch`

Analisa múltiplos arquivos em lote.

**Request (multipart/form-data):**
```
files[]: arquivo1.pdf
files[]: arquivo2.pdf
company_id: uuid-da-empresa
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_files": 5,
    "total_valor": 15000.00,
    "matched_count": 3,
    "unmatched_count": 2
  },
  "results": [...]
}
```

---

## Integração com o Frontend

### Exemplo de uso no React:

```tsx
import { useState } from 'react';

export function InvoiceUploader() {
  const [result, setResult] = useState(null);
  
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 1. Extrair dados
    const extractRes = await fetch('/api/invoice/extract', {
      method: 'POST',
      body: formData
    });
    const extracted = await extractRes.json();
    
    // 2. Cruzar com lançamentos
    const matchRes = await fetch('/api/invoice/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: currentCompany.id,
        extracted_data: extracted.data
      })
    });
    const matches = await matchRes.json();
    
    setResult(matches.data);
  };
  
  return (
    <div>
      <input type="file" accept=".pdf" onChange={e => handleUpload(e.target.files[0])} />
      {result && (
        <div>
          <p>Ação sugerida: {result.suggested_action}</p>
          <p>Matches encontrados: {result.exact_matches.length}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Deploy

### Opção 1: Como serviço Python separado

```bash
# Instalar dependências
pip install docling flask flask-cors supabase

# Configurar variáveis de ambiente
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="xxx"

# Executar
python invoice_api.py
```

### Opção 2: Como Edge Function (Deno)

O Docling é uma biblioteca Python, então para usar em Edge Functions do Supabase seria necessário:
1. Criar um serviço Python separado (Railway, Render, etc.)
2. Chamar esse serviço a partir da Edge Function

### Opção 3: Integração direta no Frontend

Para casos simples, pode-se usar a API do Docling diretamente via JavaScript (limitado).

---

## Limitações

1. **Tamanho do arquivo**: PDFs muito grandes podem demorar para processar
2. **Qualidade do scan**: PDFs escaneados com baixa qualidade podem ter erros de OCR
3. **Formatos não padronizados**: Boletos/faturas com layouts muito diferentes podem ter menor precisão
4. **Dependência de GPU**: Para melhor performance, recomenda-se GPU (opcional)

---

## Próximos Passos

1. [ ] Criar componente React para upload e visualização
2. [ ] Adicionar suporte a múltiplas páginas
3. [ ] Implementar cache de extrações
4. [ ] Adicionar treinamento customizado para formatos específicos
5. [ ] Integrar com o fluxo de pagamento (Inter API)
