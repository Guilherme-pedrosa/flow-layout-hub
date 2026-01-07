# Integração WAI ↔ Field Control — Equipamentos

> **Versão:** 1.0  
> **Data:** 2026-01-07  
> **Status:** Produção  

---

## 🎯 Princípio Central

| Sistema | Papel |
|---------|-------|
| **WAI** | System of Record (fonte da verdade) |
| **Field Control** | Camada de execução (recebe e opera) |

### ⚠️ Regra de Identidade (Imutável)

> **Identidade de equipamento é gerada exclusivamente pelo WAI.**  
> Nenhum identificador externo (Field, número de série, patrimônio) possui autoridade para criar ou redefinir identidade.

**Regra de ouro:**
- Todo equipamento **nasce no WAI**
- Toda sincronização **parte do WAI**
- O Field **nunca decide identidade**, só recebe

---

## 1️⃣ Identidade do Equipamento

### No WAI
- O equipamento possui `equipamentos.id` (UUID)
- Este ID é **imutável** — nunca muda após criação

### No Field Control
O equipamento é identificado por:
```json
{
  "externalId": "<equipamentos.id do WAI>"
}
```

### Regras de Formato e Unicidade

> O `externalId` **deve ser enviado sempre como string**, mesmo quando o UUID for armazenado internamente como UUID.  
> Isso evita bugs de serialização em SDKs e APIs.

> O valor de `externalId` **deve ser único** por equipamento dentro do tenant Field Control.  
> **Não pode ser reutilizado**, mesmo em exclusões lógicas.
> Reutilizar UUID antigo = corrupção de dados garantida.

**📌 Esta é a âncora de idempotência:**
- Reenvio ≠ duplicação
- Update ≠ novo equipamento

---

## 2️⃣ Dependência: Cliente Obrigatório

### Regra Fundamental

> **Todo equipamento DEVE estar vinculado a um cliente que já existe no Field Control.**

### Pré-requisito de Sincronização

Antes de sincronizar equipamento:
1. Verificar se `equipamentos.cliente_id` existe
2. Verificar se o cliente possui `clientes.field_customer_id`
3. Se cliente não sincronizado → sincronizar cliente **primeiro**

### Fluxo de Dependência

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Equipamento │────▶│   Cliente    │────▶│ Field Control│
│   (WAI)      │     │   (WAI)      │     │  (customer)  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       │              field_customer_id          │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────┐
│  Equipamento só pode ser criado no Field se          │
│  customerId (field_customer_id) existir              │
└──────────────────────────────────────────────────────┘
```

---

## 3️⃣ Payload Obrigatório para Field Control

### Estrutura Mínima Válida
```json
{
  "customerId": "<field_customer_id do cliente>",
  "externalId": "<equipamentos.id do WAI>",
  "name": "NOME DO EQUIPAMENTO",
  "model": "Modelo X",
  "manufacturer": "Fabricante Y",
  "serialNumber": "SN123456",
  "notes": "Observações opcionais"
}
```

### Regras Críticas do Field Control API

| Campo | Regra | Consequência se violar |
|-------|-------|------------------------|
| `customerId` | **OBRIGATÓRIO** — deve ser ID válido do Field | API rejeita (404) |
| `externalId` | **OBRIGATÓRIO** | Duplicação garantida |
| `name` | Mínimo 3 caracteres | API rejeita |
| `model` | Recomendado | Equipamento sem contexto |
| `serialNumber` | Recomendado | Dificulta identificação em campo |

---

## 4️⃣ Fluxo de Criação de Equipamento

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO PADRÃO                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Usuário │────▶│   WAI    │────▶│  Valida  │────▶│sync_jobs │
  │  cria    │     │  salva   │     │  cliente │     │ (outbox) │
  └──────────┘     └──────────┘     └────┬─────┘     └────┬─────┘
                                         │                │
                            ┌────────────┘                │
                            ▼                             ▼
                   Cliente já tem              Worker processa
                   field_customer_id?          equipamento
                            │                             │
                   ┌────────┴────────┐                    │
                   │ NÃO             │ SIM                │
                   ▼                 ▼                    ▼
            Sincroniza         Prossegue           Envia para
            cliente            direto              Field Control
            primeiro                                     │
                                                         ▼
  ┌──────────┐     ┌──────────┐     ┌──────────────────────────┐
  │   WAI    │◀────│  Worker  │◀────│   Field Control API      │
  │  atualiza│     │  recebe  │     │   POST /equipments       │
  │field_id  │     │ resposta │     │   → retorna equipment.id │
  └──────────┘     └──────────┘     └──────────────────────────┘
```

### Passo a Passo

1. **Usuário** cria equipamento no WAI
2. **WAI** valida se cliente possui `field_customer_id`
   - Se **não**: cria `sync_job` para cliente primeiro
   - Se **sim**: prossegue
3. **WAI** cria `sync_job` (entity_type: `equipment`, action: `upsert`)
4. **Worker** processa job:
   - Monta payload com `externalId = equipamentos.id`
   - Usa `customerId = clientes.field_customer_id`
   - Envia para Field Control API
   - Recebe `field_equipment_id` na resposta
5. **WAI** atualiza `equipamentos.field_equipment_id`

---

## 5️⃣ Atualização de Equipamento

Quando equipamento muda no WAI (nome, modelo, número de série):

1. WAI cria novo `sync_job` (action: `upsert`)
2. Worker envia para **mesmo endpoint**
3. Payload mantém **mesmo `externalId`**
4. Field Control:
   - Reconhece pelo `externalId`
   - Atualiza registro existente
   - **Não duplica**

### ⚠️ Mudança de Cliente (Evento Crítico)

Se equipamento mudar de cliente:
1. Novo cliente **deve estar sincronizado** com Field
2. Payload atualizado usa novo `customerId`
3. Field Control move equipamento para novo cliente

**Ações obrigatórias na mudança de cliente:**
- Gerar novo `audit_log` com action: `equipment_client_changed`
- Criar novo `sync_job` imediatamente
- **Invalidar OS abertas** vinculadas ao equipamento (se existirem)
- Notificar responsável técnico

---

## 6️⃣ Equipamento Vindo do Field (Exceção Controlada)

### Quando Acontece
- OS chega do Field via webhook
- Equipamento referenciado ainda não existe no WAI

### Regra de Tratamento
1. WAI **cria equipamento** localmente
2. Já grava `field_equipment_id` recebido
3. Gera novo `equipamentos.id` (UUID)
4. **Marca `equipamentos.created_from_field = true`**
5. Sincroniza de volta com `externalId = novo equipamentos.id`

**📌 Nunca existe equipamento "solto" sem vínculo bidirecional**

### Flag `created_from_field`

| Valor | Significado |
|-------|-------------|
| `true` | Equipamento criado a partir de dados do Field (webhook) |
| `false` | Equipamento criado nativamente no WAI |

> Útil para relatórios, auditoria e saneamento futuro de dados.

### ⛔ Proibição de Merge Automático

> **É PROIBIDO realizar merge automático de equipamentos** com base em número de série, modelo ou nome.  
> Qualquer potencial duplicidade **deve gerar alerta humano** para decisão manual.  
> Merge errado = corrupção irreversível.

---

## 7️⃣ Proibições (Anti-Patterns)

| ❌ Proibido | 💥 Consequência |
|-------------|-----------------|
| Criar equipamento direto no Field | Perda de rastreabilidade |
| Usar `serialNumber` como chave | Duplicações por variação |
| Criar equipamento sem cliente | API rejeita |
| Criar equipamento com cliente não sincronizado | API retorna 404 |
| Equipamento no Field sem espelho no WAI | Inconsistência de dados |

---

## 8️⃣ Tabela de Mapeamento

| Campo WAI (`equipamentos`) | Campo Field Control |
|----------------------------|---------------------|
| `id` | `externalId` |
| `nome` | `name` |
| `modelo` | `model` |
| `fabricante` | `manufacturer` |
| `numero_serie` | `serialNumber` |
| `patrimonio` | Pode ir em `notes` ou campo customizado |
| `observacoes` | `notes` |
| `cliente_id` → `clientes.field_customer_id` | `customerId` |
| `field_equipment_id` | `id` (retorno do Field) |
| `tipo_equipamento_id` | Mapear para tipo no Field |

---

## 9️⃣ Tipos de Equipamento

### Sincronização de Tipos

O Field Control possui tipos de equipamento (`equipment-types`).
WAI deve:
1. Manter tabela local `tipos_equipamento`
2. Mapear para IDs do Field via `field_equipment_type_id`
3. Sincronizar tipos antes de equipamentos (se necessário)

### Payload com Tipo
```json
{
  "customerId": "<field_customer_id>",
  "externalId": "<equipamentos.id>",
  "name": "Ar Condicionado Split",
  "typeId": "<field_equipment_type_id>"
}
```

---

## 🔟 Estrutura de `sync_jobs` para Equipamentos

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
  'equipment',
  'equipamento-uuid',
  'upsert',
  '{"name": "...", "externalId": "...", "customerId": "..."}',
  'pending',
  'customer',
  'cliente-uuid'
);
```

### Campos de Dependência

| Campo | Uso |
|-------|-----|
| `depends_on_entity_type` | `customer` (se cliente precisa ser sincronizado antes) |
| `depends_on_entity_id` | `clientes.id` do cliente dependente |

---

## 🔍 Observabilidade

Toda criação/atualização de equipamento **deve gerar registro em `audit_logs`**.

### Campos Mínimos Obrigatórios

| Campo | Descrição |
|-------|-----------|
| `action` | `equipment_created` \| `equipment_updated` \| `equipment_synced_field` |
| `entity_id` | `equipamentos.id` |
| `entity_type` | `equipment` |
| `metadata` | `{ field_equipment_id, field_customer_id, sync_job_id }` |

### Exemplo de Registro
```json
{
  "action": "equipment_synced_field",
  "entity_id": "uuid-do-equipamento",
  "entity_type": "equipment",
  "metadata": {
    "field_equipment_id": "67890",
    "field_customer_id": "12345",
    "sync_job_id": "uuid-do-job"
  }
}
```

---

## 🔑 Resumo Executivo

> **O equipamento nasce no WAI, é identificado pelo ID do WAI (`externalId`) e sincronizado com o Field via API. O equipamento DEVE estar vinculado a um cliente já sincronizado (`customerId`). O Field nunca é fonte de verdade para identidade.**

---

## Referências

- [Field Control API - Equipments](https://developers.fieldcontrol.com.br/)
- [Integração WAI-Field: Clientes](./INTEGRACAO_WAI_FIELD_CLIENTES.md)
- [WAI Observer Architecture](./WAI_OBSERVER_AI_ARCHITECTURE.md)
