# WAI Observer AI - Cenários, SLA Executivo e Deep-Links

## 1. CENÁRIOS REALISTAS DE PREJUÍZO (WeDo)

### Cenário 1: OS com Margem Negativa por Custo Real Oculto

**Contexto**: Técnico executa OS de manutenção preventiva em ar-condicionado.

| Campo | Valor |
|-------|-------|
| **OS** | #2847 - Cliente: Quattrocento Forneria |
| **Evento** | `service_order.checkout_completed` |
| **Tipo de Risco** | Margem negativa considerando custo real da operação |

**Dados de Entrada (event_data)**:
```json
{
  "service_order_id": "uuid-os-2847",
  "client_id": "uuid-quattrocento",
  "technician_id": "uuid-carlos",
  "scheduled_date": "2026-01-02T09:00:00Z",
  "completed_at": "2026-01-02T14:30:00Z",
  "distance_km": 78,
  "labor_hours": 5.5,
  "products_used": [
    { "product_id": "uuid-filtro-ar", "qty": 2, "unit_cost": 145.00, "sale_price": 165.00 },
    { "product_id": "uuid-gas-r410a", "qty": 1, "unit_cost": 380.00, "sale_price": 420.00 }
  ],
  "services": [
    { "service_id": "uuid-manut-prev", "sale_price": 350.00 }
  ],
  "total_billed": 1100.00
}
```

**Cálculo Econômico**:
| Item | Valor |
|------|-------|
| Receita bruta | R$ 1.100,00 |
| (-) Custo peças | R$ 670,00 (145×2 + 380) |
| (-) Custo km (R$ 1,20/km) | R$ 93,60 |
| (-) Custo hora técnica (R$ 55/h) | R$ 302,50 |
| (-) Impostos (8.5% Simples) | R$ 93,50 |
| **= Margem Líquida** | **-R$ 59,60** |
| **Margem %** | **-5.4%** |

**Alerta Gerado**:
```json
{
  "event_type": "service_order.checkout_completed",
  "severity": "critical",
  "priority_level": "economic_risk",
  "alert_category": "alert",
  "economic_reason": "OS #2847 fechou com prejuízo de R$ 59,60. Custo operacional (km + hora técnica + impostos) excede margem bruta das peças e serviços.",
  "root_cause": "Deslocamento excessivo (78km) + tempo de execução (5.5h) não cobertos no preço do serviço",
  "calculation": {
    "revenue": 1100.00,
    "cost_products": 670.00,
    "cost_km": 93.60,
    "cost_labor": 302.50,
    "cost_taxes": 93.50,
    "margin_before": 0,
    "margin_after": -5.4,
    "margin_change_percent": -5.4,
    "potential_loss": 59.60
  },
  "projected_loss_30d": 178.80,
  "impacted_entities": [
    { "type": "service_order", "id": "uuid-os-2847", "description": "OS #2847 - Quattrocento Forneria" },
    { "type": "client", "id": "uuid-quattrocento", "description": "Quattrocento Forneria - 3ª OS com margem < 5% nos últimos 60 dias" }
  ],
  "recommendation": "Revisar tabela de preços para clientes com deslocamento > 50km. Considerar taxa de deslocamento ou redistribuir técnicos por região.",
  "consequence_if_ignored": "Se padrão continuar, perda mensal estimada de R$ 178,80 apenas neste cliente",
  "decision_options": [
    { "label": "Adicionar taxa de deslocamento (R$ 1,50/km)", "risk_level": "low", "economic_effect": "Recupera R$ 117/OS média" },
    { "label": "Renegociar contrato com cliente", "risk_level": "medium", "economic_effect": "Pode perder cliente, mas elimina prejuízo" },
    { "label": "Manter e absorver", "risk_level": "high", "economic_effect": "Prejuízo recorrente confirmado" }
  ],
  "requires_human_decision": true,
  "responsible_role": "financeiro",
  "sla_hours": 24,
  "action_url": "/ordens-servico/uuid-os-2847?highlight=margin"
}
```

---

### Cenário 2: Venda com Preço Defasado vs Custo Atual

**Contexto**: Vendedor fecha orçamento usando preço antigo, mas custo do produto subiu.

| Campo | Valor |
|-------|-------|
| **Venda** | #5921 - Cliente: Ciao Ciao Restaurante |
| **Evento** | `sale.created` |
| **Tipo de Risco** | Preço de venda menor que custo atualizado |

**Dados de Entrada (event_data)**:
```json
{
  "sale_id": "uuid-venda-5921",
  "client_id": "uuid-ciao-ciao",
  "seller_id": "uuid-marina",
  "created_at": "2026-01-02T16:00:00Z",
  "items": [
    { 
      "product_id": "uuid-compressor-lg", 
      "qty": 1, 
      "sale_price": 2850.00,
      "current_cost": 2720.00,
      "cost_at_quote": 2180.00,
      "quote_date": "2025-12-15"
    }
  ],
  "total": 2850.00,
  "payment_condition": "30/60/90"
}
```

**Cálculo Econômico**:
| Item | Valor |
|------|-------|
| Preço de venda | R$ 2.850,00 |
| Custo no orçamento (15/dez) | R$ 2.180,00 |
| Custo atual (02/jan) | R$ 2.720,00 |
| Margem esperada | 30.7% |
| **Margem real** | **4.6%** |
| **Erosão de margem** | **-26.1 pp** |

**Alerta Gerado**:
```json
{
  "event_type": "sale.created",
  "severity": "critical",
  "priority_level": "economic_risk",
  "alert_category": "alert",
  "economic_reason": "Venda #5921 aprovada com margem de 4.6%, mas orçamento foi feito com custo de R$ 2.180 (agora R$ 2.720). Margem esperada era 30.7%.",
  "root_cause": "Orçamento antigo (18 dias) com custo desatualizado. Última compra do produto elevou custo em 24.8%.",
  "calculation": {
    "sale_price": 2850.00,
    "cost_at_quote": 2180.00,
    "cost_current": 2720.00,
    "margin_before": 30.7,
    "margin_after": 4.6,
    "margin_change_percent": -26.1,
    "potential_loss": 540.00
  },
  "projected_loss_30d": 540.00,
  "impacted_entities": [
    { "type": "sale", "id": "uuid-venda-5921", "description": "Venda #5921 - Ciao Ciao Restaurante" },
    { "type": "product", "id": "uuid-compressor-lg", "description": "Compressor LG 24000 BTU - custo subiu 24.8%" }
  ],
  "recommendation": "Bloquear aprovação automática de orçamentos > 7 dias. Implementar alerta de atualização de custo em produtos com variação > 10%.",
  "consequence_if_ignored": "Perda direta de R$ 540 nesta venda. Risco de padrão se repetir em outros orçamentos antigos.",
  "decision_options": [
    { "label": "Renegociar preço com cliente", "risk_level": "medium", "economic_effect": "Recupera até R$ 400" },
    { "label": "Absorver perda e ajustar política", "risk_level": "low", "economic_effect": "Perda única, previne futuras" },
    { "label": "Cancelar venda", "risk_level": "high", "economic_effect": "Zero perda, mas perde cliente" }
  ],
  "requires_human_decision": true,
  "responsible_role": "comercial",
  "sla_hours": 8,
  "action_url": "/vendas/uuid-venda-5921?highlight=pricing"
}
```

---

### Cenário 3: Produto sem Custo Cadastrado Usado em OS

**Contexto**: Técnico usa peça do estoque que nunca teve custo informado.

| Campo | Valor |
|-------|-------|
| **Produto** | Capacitor 45μF - código P0892 |
| **Evento** | `service_order.product_added` |
| **Tipo de Risco** | Margem incalculável / potencial prejuízo oculto |

**Dados de Entrada (event_data)**:
```json
{
  "service_order_id": "uuid-os-2901",
  "product_id": "uuid-capacitor-45",
  "product_code": "P0892",
  "product_name": "Capacitor 45μF 440V",
  "qty_used": 1,
  "sale_price": 85.00,
  "cost_price": null,
  "stock_qty": 12,
  "last_purchase_price": null
}
```

**Cálculo Econômico**:
| Item | Valor |
|------|-------|
| Preço de venda | R$ 85,00 |
| Custo cadastrado | **NULO** |
| Margem calculável | **NÃO** |
| Risco estimado (mercado ~R$ 65) | ~R$ 20 margem OU prejuízo |

**Alerta Gerado**:
```json
{
  "event_type": "service_order.product_added",
  "severity": "warning",
  "priority_level": "tactical_attention",
  "alert_category": "alert",
  "economic_reason": "Produto P0892 (Capacitor 45μF) usado na OS #2901 sem custo cadastrado. Impossível calcular margem real. Estoque atual: 12 unidades.",
  "root_cause": "Produto cadastrado sem informação de custo. Sem histórico de compras vinculado.",
  "calculation": {
    "sale_price": 85.00,
    "cost_current": null,
    "margin_before": null,
    "margin_after": null,
    "margin_change_percent": null,
    "potential_loss": null
  },
  "projected_loss_30d": null,
  "impacted_entities": [
    { "type": "product", "id": "uuid-capacitor-45", "description": "Capacitor 45μF 440V (P0892) - 12 em estoque" },
    { "type": "service_order", "id": "uuid-os-2901", "description": "OS #2901 usando este produto" }
  ],
  "recommendation": "Cadastrar custo do produto imediatamente. Verificar nota fiscal de entrada ou consultar fornecedor.",
  "consequence_if_ignored": "Todas as OS/vendas com este produto terão margem incorreta. Risco de prejuízo sistemático não detectado.",
  "decision_options": [
    { "label": "Cadastrar custo agora", "risk_level": "low", "economic_effect": "Corrige margem de todas as operações futuras" },
    { "label": "Ignorar temporariamente", "risk_level": "high", "economic_effect": "Margem continuará incalculável" }
  ],
  "requires_human_decision": true,
  "responsible_role": "operacoes",
  "sla_hours": 48,
  "action_url": "/produtos?edit=uuid-capacitor-45&tab=valores"
}
```

---

## 2. TABELA SLA EXECUTIVO

### Matriz de Prioridade → Responsável → Prazo

| Priority Level | Descrição | Responsible Role | SLA (horas) | Escalonamento |
|----------------|-----------|------------------|-------------|---------------|
| `strategic_risk` | Score ≥ 80 OU requires_human_decision + severity=critical | `diretoria` | 4h | → board (CEO direto) |
| `economic_risk` | Score ≥ 60 OU severity=critical | `financeiro` | 24h | → diretoria |
| `tactical_attention` | Score ≥ 30 | `operacoes` | 48h | → financeiro |
| `operational_noise` | Score < 30 | - | - | Não exibir |

### Regras de Escalonamento Automático

```
SE sla_deadline < now() E priority_level = 'tactical_attention':
  → priority_level = 'economic_risk'
  → responsible_role = 'financeiro'
  → escalation_reason = 'SLA vencido sem ação'

SE sla_deadline < now() E priority_level = 'economic_risk':
  → priority_level = 'strategic_risk'
  → responsible_role = 'diretoria'
  → escalation_reason = 'SLA crítico vencido - escalonado para diretoria'

SE sla_deadline < now() E priority_level = 'strategic_risk':
  → is_sla_breached = true
  → escalation_reason = 'ALERTA MÁXIMO: SLA estratégico violado'
```

### Mapeamento de Eventos → Prioridade Inicial

| Evento | Priority Default | Responsible Default | SLA Default |
|--------|------------------|---------------------|-------------|
| `purchase_order.approved` com custo > 20% | economic_risk | financeiro | 24h |
| `sale.created` com margem < 10% | economic_risk | comercial | 8h |
| `service_order.checkout_completed` com margem negativa | strategic_risk | diretoria | 4h |
| `product.cost_missing` em uso | tactical_attention | operacoes | 48h |
| `stock.adjustment.negative` > R$ 500 | economic_risk | operacoes | 24h |

---

## 3. SOLUÇÃO TÉCNICA: DEEP-LINK "ADICIONAR CUSTO"

### Problema Atual
O alerta "Produto sem custo cadastrado" gera `action_url: "/produtos"`, que abre a lista geral. O usuário precisa buscar o produto manualmente.

### Solução Implementada

**Opção B (Query Params)** - Já suportada no código atual!

O arquivo `GerenciarProdutos.tsx` já tem suporte para:
```typescript
const editId = searchParams.get('edit');
const tab = searchParams.get('tab');
```

**URL correta**:
```
/produtos?edit=UUID_DO_PRODUTO&tab=valores
```

### Ajustes Necessários

#### 1. Edge Function - Gerar action_url correto

No `wai-observer/index.ts`, ao gerar alerta de produto sem custo:

```typescript
action_url: `/produtos?edit=${entityId}&tab=valores`
```

#### 2. Componente ProductForm - Aba "valores" é a correta

A aba "valores" contém os campos:
- `purchase_price` (preço de compra)
- `accessory_expenses` (despesas acessórias)
- `other_expenses` (outras despesas)
- `final_cost` (custo final)

#### 3. Highlight no Campo (Opcional - Melhoria UX)

Adicionar query param `highlight=cost` para aplicar estilo visual:

```typescript
// Em ProductFormValores.tsx
const [searchParams] = useSearchParams();
const highlightField = searchParams.get('highlight');

// No campo de custo:
<Input
  className={highlightField === 'cost' ? 'ring-2 ring-amber-500 animate-pulse' : ''}
  ...
/>
```

---

## 4. CHECKLIST DE VALIDAÇÃO (TEST PLAN)

### 4.1. Teste de Deduplicação (Hash + Cooldown)

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Criar OS com margem negativa | Alerta gerado com `alert_hash` único |
| 2 | Criar outra OS idêntica (mesmo cliente, mesmos valores) em < 24h | Alerta **silenciado** (duplicata) |
| 3 | Aguardar 24h e repetir | Novo alerta gerado (cooldown expirado) |
| 4 | Verificar `ai_observer_alerts` | Apenas 2 registros, não 3 |

### 4.2. Teste de Silêncio por Threshold

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Configurar `ai_silence_rules` com `min_margin_change = 5%` | Regra ativa |
| 2 | Criar evento com margem caindo de 20% → 18% (2%) | Alerta **silenciado** |
| 3 | Criar evento com margem caindo de 20% → 12% (8%) | Alerta **gerado** |

### 4.3. Teste de Top 7 Alertas

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Gerar 10 alertas críticos em sequência | Apenas 7 mais prioritários ativos |
| 2 | Verificar ordenação | Por `economic_priority_score` DESC |
| 3 | Marcar 3 como `is_actioned = true` | Contagem ativa = 7 (4 anteriores + 3 novos entram) |

### 4.4. Teste de Feedback Loop

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Alerta crítico exibido para "Produto X sem custo" | Alerta visível no painel |
| 2 | Usuário clica "Dispensar" (falso positivo) | `ai_alert_feedback` registra `action: 'dismissed'` |
| 3 | Mesmo evento ocorre novamente | Alerta **silenciado** ou prioridade reduzida |
| 4 | Verificar `ai_economic_memory` | Entidade marcada com histórico de feedback |

### 4.5. Teste de SLA e Escalonamento

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Alerta tático criado às 10:00 | `sla_deadline = 10:00 + 48h` |
| 2 | Aguardar SLA vencer (ou simular) | `is_sla_breached = true` |
| 3 | Executar `ai_check_and_escalate_sla()` | `priority_level` sobe para `economic_risk` |
| 4 | Verificar `escalation_reason` | "SLA vencido sem ação" |
| 5 | Verificar `responsible_role` | Mudou de `operacoes` → `financeiro` |

### 4.6. Teste de Deep-Link

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Alerta "Produto sem custo" com `action_url = /produtos?edit=UUID&tab=valores` | URL correta no alerta |
| 2 | Clicar no botão "Adicionar custo" | Navega para `/produtos?edit=UUID&tab=valores` |
| 3 | Verificar tela | Dialog do produto abre com aba "Valores" ativa |
| 4 | Campo de custo visível | Pronto para edição |

### 4.7. Teste End-to-End: Cenário WeDo

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Criar OS #2847 com dados do Cenário 1 | OS criada |
| 2 | Checkout da OS | Evento `service_order.checkout_completed` disparado |
| 3 | WAI Observer processa | Alerta crítico gerado |
| 4 | Verificar painel de alertas | Alerta aparece com severidade "critical" |
| 5 | Verificar `action_url` | `/ordens-servico/UUID?highlight=margin` |
| 6 | Clicar no alerta | Navega para OS com destaque na margem |

---

## 5. QUERIES DE VERIFICAÇÃO

### Verificar Alertas Ativos por Empresa
```sql
SELECT 
  id, 
  event_type, 
  severity, 
  priority_level,
  responsible_role,
  economic_reason,
  potential_loss,
  sla_deadline,
  is_sla_breached,
  action_url,
  created_at
FROM ai_observer_alerts
WHERE company_id = 'UUID_EMPRESA'
  AND is_dismissed = false
  AND is_actioned = false
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'warning' THEN 2 
    ELSE 3 
  END,
  economic_priority_score DESC
LIMIT 7;
```

### Verificar Memória Econômica de Entidade
```sql
SELECT *
FROM ai_economic_memory
WHERE company_id = 'UUID_EMPRESA'
  AND entity_type = 'product'
  AND entity_id = 'UUID_PRODUTO';
```

### Verificar Feedback Recente
```sql
SELECT 
  f.alert_id,
  f.action,
  f.feedback_score,
  f.notes,
  f.created_at,
  a.event_type,
  a.economic_reason
FROM ai_alert_feedback f
JOIN ai_observer_alerts a ON a.id = f.alert_id
WHERE f.company_id = 'UUID_EMPRESA'
ORDER BY f.created_at DESC
LIMIT 20;
```

### Verificar Alertas com SLA Vencido
```sql
SELECT 
  id,
  event_type,
  priority_level,
  responsible_role,
  sla_deadline,
  EXTRACT(EPOCH FROM (now() - sla_deadline))/3600 as hours_overdue
FROM ai_observer_alerts
WHERE company_id = 'UUID_EMPRESA'
  AND is_sla_breached = false
  AND sla_deadline < now()
  AND is_dismissed = false
  AND is_actioned = false;
```
