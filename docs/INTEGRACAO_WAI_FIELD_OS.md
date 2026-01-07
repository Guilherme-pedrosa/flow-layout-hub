# Integração WAI ↔ Field Control — Ordens de Serviço (OS)

> **Versão:** 1.0  
> **Data:** 2026-01-07  
> **Status:** Produção  

---

## 🎯 Princípio Central

| Sistema | Papel |
|---------|-------|
| **WAI** | System of Record (fonte da verdade) |
| **Field Control** | Camada de execução (recebe, executa e notifica) |

### ⚠️ Regra de Identidade (Imutável)

> **Identidade de OS é gerada exclusivamente pelo WAI.**  
> Nenhum identificador externo (Field, número sequencial, protocolo) possui autoridade para criar ou redefinir identidade.

**Regra de ouro:**
- Toda OS **nasce no WAI**
- Field Control **executa e reporta status**
- Fechamento de OS **reflete no WAI**
- Faturamento **só acontece no WAI**

---

## 1️⃣ Identidade da OS

### No WAI
- A OS possui `ordens_servico.id` (UUID)
- Este ID é **imutável** — nunca muda após criação

### No Field Control
A OS (Activity/Task) é identificada por:
```json
{
  "externalId": "<ordens_servico.id do WAI>"
}
```

### Regras de Formato e Unicidade

> O `externalId` **deve ser enviado sempre como string**, mesmo quando o UUID for armazenado internamente como UUID.

> O valor de `externalId` **deve ser único** por OS dentro do tenant Field Control.  
> **Não pode ser reutilizado**, mesmo em exclusões lógicas.

**📌 Esta é a âncora de idempotência:**
- Reenvio ≠ duplicação
- Update de status ≠ nova OS

---

## 2️⃣ Dependências Obrigatórias

### Cadeia de Dependência

```
┌──────────────────────────────────────────────────────────────┐
│                    HIERARQUIA DE DEPENDÊNCIA                 │
└──────────────────────────────────────────────────────────────┘

     ┌─────────┐         ┌─────────────┐         ┌─────────┐
     │ CLIENTE │────────▶│ EQUIPAMENTO │────────▶│   OS    │
     └─────────┘         └─────────────┘         └─────────┘
          │                    │                      │
          ▼                    ▼                      ▼
   field_customer_id    field_equipment_id     field_activity_id
```

### Pré-requisitos para Sincronizar OS

| Entidade | Requisito | Verificação |
|----------|-----------|-------------|
| Cliente | Deve existir no Field | `clientes.field_customer_id IS NOT NULL` |
| Equipamento | Deve existir no Field (se vinculado) | `equipamentos.field_equipment_id IS NOT NULL` |
| Técnico | Deve existir no Field | `tecnicos.field_worker_id IS NOT NULL` |

> **Se qualquer dependência não estiver sincronizada, sincronizar ANTES da OS.**

---

## 3️⃣ Payload Obrigatório para Field Control

### Estrutura Mínima Válida (Activity)
```json
{
  "externalId": "<ordens_servico.id do WAI>",
  "customerId": "<field_customer_id>",
  "identifier": "OS-2024-00123",
  "description": "Manutenção preventiva",
  "duration": 60,
  "scheduledDate": "2024-01-15",
  "scheduledTime": "09:00",
  "address": {
    "street": "Av. Principal",
    "number": "123",
    "district": "Centro",
    "city": "Goiânia",
    "state": "GO",
    "zipCode": "74000000",
    "coords": {
      "latitude": -16.6869,
      "longitude": -49.2648
    }
  }
}
```

### Payload com Equipamento e Técnico
```json
{
  "externalId": "<ordens_servico.id>",
  "customerId": "<field_customer_id>",
  "equipmentId": "<field_equipment_id>",
  "assignedWorkerId": "<field_worker_id>",
  "identifier": "OS-2024-00123",
  "description": "Manutenção corretiva - Ar condicionado",
  "duration": 120,
  "scheduledDate": "2024-01-15",
  "scheduledTime": "14:00",
  "priority": "high",
  "taskTypeId": "<field_task_type_id>",
  "address": { ... }
}
```

### Regras Críticas do Field Control API

| Campo | Regra | Consequência se violar |
|-------|-------|------------------------|
| `externalId` | **OBRIGATÓRIO** | Duplicação garantida |
| `customerId` | **OBRIGATÓRIO** | API rejeita (404) |
| `identifier` | Único por empresa | Pode causar confusão |
| `duration` | Minutos (inteiro) | API rejeita |
| `scheduledDate` | Formato YYYY-MM-DD | API rejeita |
| `address.coords` | **OBRIGATÓRIO** | API rejeita |

---

## 4️⃣ Fluxo de Vida da OS

### Ciclo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                     CICLO DE VIDA DA OS                         │
└─────────────────────────────────────────────────────────────────┘

  WAI                          Field Control                WAI
   │                                │                        │
   │  1. Cria OS                    │                        │
   ├───────────────────────────────▶│                        │
   │     (sync_job)                 │                        │
   │                                │                        │
   │  2. Recebe field_activity_id   │                        │
   │◀───────────────────────────────┤                        │
   │                                │                        │
   │                                │  3. Técnico executa    │
   │                                │     (check-in/out)     │
   │                                │                        │
   │  4. Webhook: status changed    │                        │
   │◀───────────────────────────────┤                        │
   │                                │                        │
   │  5. Webhook: activity closed   │                        │
   │◀───────────────────────────────┤                        │
   │     (fotos, assinatura, peças) │                        │
   │                                │                        │
   │                                                         │
   │  6. WAI processa fechamento ───────────────────────────▶│
   │     - Atualiza status                                   │
   │     - Registra consumo peças                            │
   │     - Libera para faturamento                           │
   │                                                         │
```

---

## 5️⃣ Status da OS (Mapeamento WAI ↔ Field)

### Tabela de Status

| Status WAI | Status Field Control | Descrição |
|------------|---------------------|-----------|
| `rascunho` | — | Não sincroniza |
| `agendada` | `scheduled` | OS criada e agendada |
| `despachada` | `dispatched` | Enviada para técnico |
| `em_execucao` | `started` | Técnico fez check-in |
| `pausada` | `paused` | Execução pausada |
| `concluida` | `completed` | Técnico finalizou |
| `cancelada` | `cancelled` | OS cancelada |
| `faturada` | — | Processada no WAI (pós-Field) |

### Regras de Transição

| De → Para | Origem | Ação |
|-----------|--------|------|
| `rascunho` → `agendada` | WAI | Cria sync_job |
| `agendada` → `despachada` | WAI ou Field | Atribui técnico |
| `despachada` → `em_execucao` | Field (webhook) | Técnico check-in |
| `em_execucao` → `concluida` | Field (webhook) | Técnico check-out |
| `concluida` → `faturada` | WAI | Após processamento financeiro |
| `* → cancelada` | WAI | Cancela no Field também |

---

## 6️⃣ Webhooks do Field Control

### Eventos Relevantes

| Evento | Quando | Ação no WAI |
|--------|--------|-------------|
| `activity.started` | Check-in do técnico | Atualiza status para `em_execucao` |
| `activity.paused` | Técnico pausa | Atualiza status para `pausada` |
| `activity.resumed` | Técnico retoma | Atualiza status para `em_execucao` |
| `activity.completed` | Check-out do técnico | Processa fechamento |
| `activity.cancelled` | Cancelamento | Atualiza status para `cancelada` |

### Payload do Webhook (exemplo)
```json
{
  "event": "activity.completed",
  "data": {
    "id": "field_activity_id",
    "externalId": "uuid-da-os-no-wai",
    "customerId": "field_customer_id",
    "status": "completed",
    "checkinAt": "2024-01-15T14:05:00Z",
    "checkoutAt": "2024-01-15T16:30:00Z",
    "items": [
      { "productId": "xxx", "quantity": 2, "description": "Filtro" }
    ],
    "photos": [ "url1", "url2" ],
    "signature": "base64...",
    "notes": "Serviço concluído com sucesso"
  }
}
```

### Processamento de Fechamento

1. **Identificar OS** pelo `externalId`
2. **Atualizar status** para `concluida`
3. **Registrar consumo de peças** (ver documento de Estoque)
4. **Salvar evidências** (fotos, assinatura)
5. **Calcular tempo real** de execução
6. **Liberar para faturamento**
7. **Gerar audit_log**

---

## 7️⃣ OS Vindo do Field (Exceção Controlada)

### Quando Acontece
- Técnico cria OS em campo via app Field
- OS referencia cliente/equipamento existente

### Regra de Tratamento

1. WAI recebe webhook `activity.created`
2. Identifica cliente pelo `customerId` → busca `field_customer_id`
3. Identifica equipamento pelo `equipmentId` (se houver)
4. **Cria OS** localmente
5. Grava `field_activity_id` recebido
6. Gera novo `ordens_servico.id` (UUID)
7. **Marca `ordens_servico.created_from_field = true`**
8. Sincroniza de volta com `externalId = novo ordens_servico.id`

### Flag `created_from_field`

| Valor | Significado |
|-------|-------------|
| `true` | OS criada pelo técnico em campo |
| `false` | OS criada nativamente no WAI |

### ⛔ Proibição de Merge Automático

> **É PROIBIDO realizar merge automático de OS** com base em data, cliente ou descrição.  
> Qualquer potencial duplicidade **deve gerar alerta humano**.

---

## 8️⃣ Atribuição de Técnico

### Regras de Atribuição

1. Técnico deve existir no WAI (`tecnicos` ou `users`)
2. Técnico deve estar sincronizado (`field_worker_id IS NOT NULL`)
3. Payload usa `assignedWorkerId = field_worker_id`

### Reatribuição

Se técnico mudar:
1. WAI cria novo `sync_job` com action `update`
2. Field Control atualiza assignment
3. Técnico anterior perde acesso à OS no app

### Múltiplos Técnicos

Se OS precisar de múltiplos técnicos:
- Field Control suporta via `team`
- WAI deve mapear para `ordens_servico_tecnicos` (tabela pivot)

---

## 9️⃣ Proibições (Anti-Patterns)

| ❌ Proibido | 💥 Consequência |
|-------------|-----------------|
| Criar OS direto no Field (sem flag) | Perda de rastreabilidade |
| Usar `identifier` como chave única | Duplicações |
| Fechar OS no WAI sem webhook | Inconsistência de dados |
| Faturar OS não concluída | Erro financeiro |
| Ignorar consumo de peças | Estoque incorreto |
| OS sem coordenadas | API rejeita |

---

## 🔟 Tabela de Mapeamento

| Campo WAI (`ordens_servico`) | Campo Field Control |
|------------------------------|---------------------|
| `id` | `externalId` |
| `numero_os` | `identifier` |
| `descricao` | `description` |
| `data_agendada` | `scheduledDate` |
| `hora_agendada` | `scheduledTime` |
| `duracao_prevista` | `duration` (minutos) |
| `prioridade` | `priority` (low/medium/high) |
| `cliente_id` → `field_customer_id` | `customerId` |
| `equipamento_id` → `field_equipment_id` | `equipmentId` |
| `tecnico_id` → `field_worker_id` | `assignedWorkerId` |
| `tipo_servico_id` → mapeamento | `taskTypeId` |
| `field_activity_id` | `id` (retorno do Field) |
| `status` | Ver tabela de status |

---

## 1️⃣1️⃣ Estrutura de `sync_jobs` para OS

```sql
INSERT INTO sync_jobs (
  company_id,
  entity_type,
  entity_id,
  action,
  payload_json,
  status,
  depends_on_entity_type,
  depends_on_entity_id
) VALUES (
  'company-uuid',
  'service_order',
  'os-uuid',
  'upsert',
  '{"externalId": "...", "customerId": "...", ...}',
  'pending',
  'customer',
  'cliente-uuid'
);
```

### Dependências Múltiplas

Para OS com equipamento:
```sql
-- Job 1: Garantir cliente sincronizado
-- Job 2: Garantir equipamento sincronizado  
-- Job 3: Sincronizar OS (depends_on: equipment)
```

---

## 🔍 Observabilidade

### Audit Logs Obrigatórios

| Evento | action | metadata |
|--------|--------|----------|
| OS criada | `service_order_created` | `{ sync_job_id }` |
| OS sincronizada | `service_order_synced_field` | `{ field_activity_id }` |
| Status alterado | `service_order_status_changed` | `{ old_status, new_status, source }` |
| Técnico atribuído | `service_order_assigned` | `{ worker_id, field_worker_id }` |
| OS concluída | `service_order_completed` | `{ duration_real, items_consumed }` |
| OS faturada | `service_order_invoiced` | `{ invoice_id, total }` |

### Exemplo de Registro
```json
{
  "action": "service_order_completed",
  "entity_id": "uuid-da-os",
  "entity_type": "service_order",
  "metadata": {
    "field_activity_id": "12345",
    "duration_real": 145,
    "items_consumed": [
      { "product_id": "xxx", "quantity": 2 }
    ],
    "photos_count": 3,
    "has_signature": true,
    "sync_job_id": "uuid-do-job"
  }
}
```

---

## 🔑 Resumo Executivo

> **A OS nasce no WAI, é identificada pelo ID do WAI (`externalId`) e sincronizada com o Field para execução. O técnico executa no Field e reporta via webhooks. O fechamento no Field dispara processamento no WAI (consumo de peças, evidências, faturamento). O WAI é sempre a fonte da verdade final.**

---

## Referências

- [Field Control API - Activities](https://developers.fieldcontrol.com.br/)
- [Integração WAI-Field: Clientes](./INTEGRACAO_WAI_FIELD_CLIENTES.md)
- [Integração WAI-Field: Equipamentos](./INTEGRACAO_WAI_FIELD_EQUIPAMENTOS.md)
- [WAI Observer Architecture](./WAI_OBSERVER_AI_ARCHITECTURE.md)
