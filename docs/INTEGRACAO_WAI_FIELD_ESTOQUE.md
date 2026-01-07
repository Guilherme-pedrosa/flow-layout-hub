# Integração WAI ↔ Field Control — Estoque (Consumo de Peças)

> **Versão:** 1.0  
> **Data:** 2026-01-07  
> **Status:** Produção  

---

## 🎯 Princípio Central

| Sistema | Papel |
|---------|-------|
| **WAI** | System of Record (controle de estoque) |
| **Field Control** | Camada de execução (reporta consumo) |

### ⚠️ Regra Fundamental (Imutável)

> **O WAI é a única fonte de verdade para saldo de estoque.**  
> O Field Control apenas **reporta consumo** — nunca controla saldo.

**Regra de ouro:**
- Consumo de peças **vem do Field** (webhook)
- Baixa de estoque **acontece no WAI**
- Saldo **nunca existe no Field**
- Rollback **só acontece no WAI**

---

## 1️⃣ Fluxo de Consumo de Peças

### Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUXO DE CONSUMO DE PEÇAS                      │
└─────────────────────────────────────────────────────────────────┘

  Field Control                                           WAI
       │                                                   │
       │  1. Técnico adiciona peças na OS                  │
       │     (via app em campo)                            │
       │                                                   │
       │  2. Técnico fecha OS                              │
       │     (check-out)                                   │
       │                                                   │
       │  3. Webhook: activity.completed                   │
       ├──────────────────────────────────────────────────▶│
       │     { items: [...], externalId: "..." }           │
       │                                                   │
       │                                    4. WAI processa│
       │                                       consumo     │
       │                                          │        │
       │                                          ▼        │
       │                              ┌───────────────────┐│
       │                              │ Valida produtos   ││
       │                              │ Verifica saldo    ││
       │                              │ Executa baixa     ││
       │                              │ Registra movimento││
       │                              │ Gera audit_log    ││
       │                              └───────────────────┘│
       │                                                   │
```

---

## 2️⃣ Estrutura do Webhook de Consumo

### Payload do Field Control

```json
{
  "event": "activity.completed",
  "data": {
    "id": "field_activity_id",
    "externalId": "uuid-da-os-no-wai",
    "items": [
      {
        "productId": "field_product_id",
        "externalId": "uuid-do-produto-no-wai",
        "description": "Filtro de ar condicionado",
        "quantity": 2,
        "unitPrice": 45.00
      },
      {
        "productId": "field_product_id_2",
        "externalId": "uuid-do-produto-2",
        "description": "Gás refrigerante R410A",
        "quantity": 1,
        "unitPrice": 180.00
      }
    ]
  }
}
```

### ⚠️ Regra sobre `unitPrice`

> O `unitPrice` vindo do Field é **apenas evidência**, não fonte de verdade.  
> O preço faturável **deve ser resolvido no WAI** (tabela de preços, contrato do cliente, ou política comercial).  
> Isso evita problemas quando técnico edita preço no app.

### Identificação do Produto

| Campo | Uso | Prioridade |
|-------|-----|------------|
| `externalId` | UUID do produto no WAI | **1ª (preferencial)** |
| `productId` | ID do produto no Field | 2ª (fallback) |
| `description` | Nome do produto | Apenas log/auditoria |

> **Sempre usar `externalId` quando disponível.**  
> Se não existir, buscar por `field_product_id` na tabela `produtos`.

---

## 3️⃣ Processamento de Consumo no WAI

### Algoritmo de Processamento

```
PARA CADA item no webhook:
  1. IDENTIFICAR produto
     - Buscar por externalId OU field_product_id
     - SE não encontrar → ALERTA + SKIP (não bloqueia)
  
  2. VERIFICAR saldo
     - Buscar saldo atual do produto
     - SE saldo < quantidade → ALERTA (estoque negativo)
  
  3. EXECUTAR baixa
     - Criar movimentacao_estoque (tipo: 'saida_os')
     - Atualizar saldo_estoque
  
  4. VINCULAR à OS
     - Inserir em os_itens (produto, quantidade, valor)
  
  5. REGISTRAR auditoria
     - Criar audit_log com todos os detalhes
```

### Regras de Negócio

| Situação | Comportamento | Justificativa |
|----------|---------------|---------------|
| Produto não encontrado | Alerta + Skip | Não bloqueia fechamento |
| Saldo insuficiente | Baixa + Alerta | Permite operação, sinaliza problema |
| Quantidade zero | Ignora item | Otimização |
| Produto inativo | Baixa + Alerta | Consumo real aconteceu |

> **Filosofia:** O consumo real no campo é fato consumado.  
> O WAI registra a realidade, mesmo que imperfeita, e gera alertas para correção.

---

## 4️⃣ Estrutura de Dados no WAI

### Tabela `movimentacoes_estoque`

```sql
INSERT INTO movimentacoes_estoque (
  company_id,
  produto_id,
  tipo,
  quantidade,
  saldo_anterior,
  saldo_posterior,
  referencia_tipo,
  referencia_id,
  origem,
  observacao,
  created_at
) VALUES (
  'company-uuid',
  'produto-uuid',
  'saida_os',
  2,
  10,
  8,
  'ordem_servico',
  'os-uuid',
  'field_webhook',
  'Consumo registrado via Field Control',
  NOW()
);
```

### Tabela `os_itens`

```sql
INSERT INTO os_itens (
  ordem_servico_id,
  produto_id,
  quantidade,
  valor_unitario,
  valor_total,
  origem,
  field_item_data
) VALUES (
  'os-uuid',
  'produto-uuid',
  2,
  45.00,
  90.00,
  'field',
  '{"productId": "...", "externalId": "..."}'
);
```

---

## 5️⃣ Idempotência de Consumo

### Problema

O webhook pode ser reenviado (retry, duplicação, etc.).

### Solução

| Estratégia | Implementação |
|------------|---------------|
| Hash único | `consumo_hash = SHA256(os_id + produto_id + quantidade + timestamp_fechamento)` |
| Verificação | Antes de processar, verificar se hash já existe |
| Resultado | Se existe → skip silencioso |

### Estrutura de Controle

```sql
CREATE TABLE consumo_processado (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  ordem_servico_id UUID NOT NULL,
  consumo_hash TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_data JSONB
);
```

### Fluxo de Verificação

```
1. Receber webhook
2. Calcular consumo_hash
3. Buscar hash em consumo_processado
4. SE existe → retornar sucesso (idempotente)
5. SE não existe:
   - Processar consumo
   - Inserir hash
   - Retornar sucesso
```

---

## 6️⃣ Rollback de Consumo

### Quando Acontece

- OS cancelada após fechamento
- Erro identificado no consumo
- Devolução de peça pelo técnico

### Processo de Rollback

```
┌─────────────────────────────────────────────────────────────────┐
│                     ROLLBACK DE CONSUMO                         │
└─────────────────────────────────────────────────────────────────┘

  1. Identificar consumos da OS
     SELECT * FROM movimentacoes_estoque 
     WHERE referencia_tipo = 'ordem_servico' 
     AND referencia_id = 'os-uuid';

  2. Para cada movimentação:
     - Criar movimentação inversa (tipo: 'estorno_os')
     - Atualizar saldo_estoque
     - Marcar original como 'estornada'

  3. Atualizar os_itens
     - Marcar itens como 'estornado'
     - Ou remover (decisão de negócio)

  4. Registrar audit_log
     - action: 'stock_consumption_reversed'
     - metadata: { reason, reversed_by, items }
```

### Movimentação de Estorno

```sql
INSERT INTO movimentacoes_estoque (
  company_id,
  produto_id,
  tipo,
  quantidade,
  saldo_anterior,
  saldo_posterior,
  referencia_tipo,
  referencia_id,
  movimentacao_origem_id,
  origem,
  observacao
) VALUES (
  'company-uuid',
  'produto-uuid',
  'estorno_os',
  2,              -- quantidade positiva (devolve ao estoque)
  8,
  10,
  'ordem_servico',
  'os-uuid',
  'movimentacao-original-uuid',
  'manual',
  'Estorno de consumo - OS cancelada'
);
```

---

## 7️⃣ Sincronização de Produtos (WAI → Field)

### Regra Fundamental

> Produtos devem existir no Field para serem selecionados pelo técnico.

### Fluxo de Sincronização

1. Produto criado/atualizado no WAI
2. `sync_job` criado (entity_type: `product`)
3. Worker envia para Field Control
4. WAI salva `field_product_id`

### Payload Mínimo

```json
{
  "externalId": "<produtos.id do WAI>",
  "name": "Filtro de ar condicionado",
  "code": "FLT-001",
  "price": 45.00,
  "description": "Filtro HEPA para ar condicionado split"
}
```

### Regras

| Campo WAI | Campo Field | Obrigatório |
|-----------|-------------|-------------|
| `id` | `externalId` | ✔️ |
| `nome` | `name` | ✔️ |
| `codigo` | `code` | Recomendado |
| `preco_venda` | `price` | Recomendado |
| `descricao` | `description` | Opcional |

---

## 8️⃣ Alertas e Anomalias

### Situações que Geram Alerta

| Situação | Severidade | Ação |
|----------|------------|------|
| Produto não encontrado | `warning` | Log + notificação |
| Estoque negativo | `critical` | Log + notificação + bloqueia faturamento |
| Quantidade anormal (>10x média) | `warning` | Log + revisão manual |
| Consumo em OS já faturada | `error` | Rejeita + notificação |
| Webhook duplicado | `info` | Log silencioso |

### Estrutura de Alerta

```json
{
  "alert_type": "stock_consumption_anomaly",
  "severity": "critical",
  "entity_type": "service_order",
  "entity_id": "os-uuid",
  "message": "Consumo de peças resultou em estoque negativo",
  "metadata": {
    "product_id": "produto-uuid",
    "product_name": "Filtro HEPA",
    "quantity_consumed": 5,
    "stock_before": 2,
    "stock_after": -3
  }
}
```

---

## 9️⃣ Proibições (Anti-Patterns)

| ❌ Proibido | 💥 Consequência |
|-------------|-----------------|
| Manter saldo no Field | Inconsistência de dados |
| Ignorar consumo de produto não encontrado | Perda de rastreabilidade |
| Bloquear fechamento por falta de estoque | Operação travada |
| Processar webhook duplicado | Baixa duplicada |
| Estornar sem movimentação inversa | Saldo incorreto |
| **Consumir em OS já faturada** | **ERRO FINANCEIRO CRÍTICO** |

### ⛔ Regra Hard: OS Faturada

> **SE A OS ESTIVER FATURADA, QUALQUER NOVO CONSUMO DEVE SER REJEITADO.**  
> Não há exceção. Não há override.  
> Para ajustar consumo pós-faturamento, é necessário **estornar a fatura primeiro**.

---

## 🔟 Estoque Multi-Local (Nota Arquitetural)

> A arquitetura atual **já suporta múltiplos estoques** (técnico, veículo, almoxarifado central).  
> Não é necessário implementar agora, mas o caminho está aberto.

### Estrutura Futura (quando necessário)

| Local | Uso |
|-------|-----|
| `almoxarifado` | Estoque central da empresa |
| `veiculo_{id}` | Estoque do veículo do técnico |
| `tecnico_{id}` | Estoque pessoal do técnico |

> Quando implementado, o consumo deverá especificar `estoque_origem` na movimentação.

---

## 1️⃣1️⃣ Observabilidade

### Audit Logs Obrigatórios

| Evento | action | metadata |
|--------|--------|----------|
| Consumo processado | `stock_consumption_processed` | `{ os_id, items, source }` |
| Produto não encontrado | `stock_product_not_found` | `{ field_product_id, description }` |
| Estoque negativo | `stock_negative_balance` | `{ product_id, balance }` |
| Consumo estornado | `stock_consumption_reversed` | `{ os_id, reason, items }` |
| Webhook duplicado | `stock_webhook_duplicate` | `{ hash, os_id }` |

### Exemplo de Registro

```json
{
  "action": "stock_consumption_processed",
  "entity_id": "os-uuid",
  "entity_type": "service_order",
  "metadata": {
    "items": [
      { "product_id": "xxx", "quantity": 2, "stock_after": 8 },
      { "product_id": "yyy", "quantity": 1, "stock_after": 15 }
    ],
    "source": "field_webhook",
    "webhook_received_at": "2024-01-15T16:35:00Z",
    "processed_at": "2024-01-15T16:35:02Z"
  }
}
```

---

## 1️⃣1️⃣ Métricas Recomendadas

| Métrica | Cálculo | Uso |
|---------|---------|-----|
| Consumo médio por OS | `SUM(quantidade) / COUNT(os)` | Planejamento |
| Taxa de estoque negativo | `% de baixas com saldo < 0` | Qualidade |
| Tempo de processamento | `processed_at - webhook_received_at` | Performance |
| Taxa de produto não encontrado | `% de items sem match` | Cadastro |

---

## 🔑 Resumo Executivo

> **O Field Control reporta consumo de peças via webhook. O WAI processa a baixa de estoque de forma idempotente, registra movimentações auditáveis e gera alertas para anomalias. O saldo de estoque é controlado exclusivamente pelo WAI. Rollbacks são sempre feitos via movimentação inversa, nunca por edição direta.**

---

## Referências

- [Field Control API - Products](https://developers.fieldcontrol.com.br/)
- [Integração WAI-Field: OS](./INTEGRACAO_WAI_FIELD_OS.md)
- [Integração WAI-Field: Clientes](./INTEGRACAO_WAI_FIELD_CLIENTES.md)
- [WAI Observer Architecture](./WAI_OBSERVER_AI_ARCHITECTURE.md)
