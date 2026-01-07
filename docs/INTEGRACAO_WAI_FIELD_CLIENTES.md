# Integração WAI ↔ Field Control — Cadastro de Clientes

> **Versão:** 1.0  
> **Data:** 2026-01-07  
> **Status:** Produção  

---

## 🎯 Princípio Central

| Sistema | Papel |
|---------|-------|
| **WAI** | System of Record (fonte da verdade) |
| **Field Control** | Camada de execução (recebe e opera) |

**Regra de ouro:**
- Todo cliente **nasce no WAI**
- Toda sincronização **parte do WAI**
- O Field **nunca decide identidade**, só recebe

---

## 1️⃣ Identidade do Cliente

### No WAI
- O cliente possui `clientes.id` (UUID)
- Este ID é **imutável** — nunca muda após criação

### No Field Control
O cliente é identificado por:
```json
{
  "external": {
    "id": "<clientes.id do WAI>"
  }
}
```

**📌 Esta é a âncora de idempotência:**
- Reenvio ≠ duplicação
- Update ≠ novo cliente

---

## 2️⃣ Payload Obrigatório para Field Control

### Estrutura Mínima Válida
```json
{
  "name": "NOME DO CLIENTE",
  "external": {
    "id": "uuid-do-cliente-no-wai"
  },
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

### Regras Críticas do Field Control API

| Campo | Regra | Consequência se violar |
|-------|-------|------------------------|
| `name` | Mínimo 6 caracteres | API rejeita |
| `coords.latitude` | **OBRIGATÓRIO** | API rejeita |
| `coords.longitude` | **OBRIGATÓRIO** | API rejeita |
| `external.id` | **OBRIGATÓRIO** | Duplicação garantida |
| `zipCode` | 8 dígitos numéricos | API rejeita |

---

## 3️⃣ Fluxo de Criação de Cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO PADRÃO                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Usuário │────▶│   WAI    │────▶│sync_jobs │────▶│  Worker  │
  │  cria    │     │  salva   │     │ (outbox) │     │ processa │
  └──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                                          ▼
  ┌──────────┐     ┌──────────┐     ┌──────────────────────────┐
  │   WAI    │◀────│  Worker  │◀────│   Field Control API      │
  │  atualiza│     │  recebe  │     │   POST /customers        │
  │field_id  │     │ resposta │     │   → retorna customer.id  │
  └──────────┘     └──────────┘     └──────────────────────────┘
```

### Passo a Passo

1. **Usuário** cria cliente no WAI
2. **WAI** salva cliente em `clientes` com `id` (UUID)
3. **WAI** cria `sync_job` (entity_type: `customer`, action: `upsert`)
4. **Worker** processa job:
   - Monta payload com `external.id = clientes.id`
   - Envia para Field Control API
   - Recebe `field_customer_id` na resposta
5. **WAI** atualiza `clientes.field_customer_id`

**📌 A partir daqui, todo equipamento, OS e atualização usa `field_customer_id`**

---

## 4️⃣ Atualização de Cliente

Quando cliente muda no WAI (nome, endereço, telefone):

1. WAI cria novo `sync_job` (action: `upsert`)
2. Worker envia para **mesmo endpoint**
3. Payload mantém **mesmo `external.id`**
4. Field Control:
   - Reconhece pelo `external.id`
   - Atualiza registro existente
   - **Não duplica**

---

## 5️⃣ Cliente Vindo do Field (Exceção Controlada)

### Quando Acontece
- Equipamento ou OS chega do Field via webhook
- Cliente referenciado ainda não existe no WAI

### Regra de Tratamento
1. WAI **cria cliente** localmente
2. Já grava `field_customer_id` recebido
3. Gera novo `clientes.id` (UUID)
4. Sincroniza de volta com `external.id = novo clientes.id`

**📌 Nunca existe cliente "solto" sem vínculo bidirecional**

---

## 6️⃣ Proibições (Anti-Patterns)

| ❌ Proibido | 💥 Consequência |
|-------------|-----------------|
| Criar cliente direto no Field | Perda de rastreabilidade |
| Usar `name` como chave | Duplicações por variação de escrita |
| Usar `cpf_cnpj` como idempotência | Field não valida documentos |
| Criar cliente sem coordenadas | API rejeita silenciosamente |
| Cliente no Field sem espelho no WAI | Inconsistência de dados |

---

## 7️⃣ Tabela de Mapeamento

| Campo WAI (`clientes`) | Campo Field Control |
|------------------------|---------------------|
| `id` | `external.id` |
| `razao_social` ou `nome_fantasia` | `name` |
| `logradouro` | `address.street` |
| `numero` | `address.number` |
| `bairro` | `address.district` |
| `cidade` | `address.city` |
| `estado` | `address.state` |
| `cep` | `address.zipCode` |
| (geocodificado) | `address.coords.latitude` |
| (geocodificado) | `address.coords.longitude` |
| `telefone` | `phones[0].number` |
| `email` | `emails[0].address` |
| `field_customer_id` | `id` (retorno do Field) |

---

## 8️⃣ Geocodificação

### Responsabilidade
- WAI deve geocodificar endereço **antes** de enviar ao Field
- Usar API de geocodificação (Google Maps, ViaCEP + nominatim, etc.)

### Fallback
Se geocodificação falhar:
1. Usar coordenadas da cidade (centro)
2. Registrar flag `geocode_approximate = true`
3. Alertar usuário para correção manual

---

## 9️⃣ Estrutura de `sync_jobs` para Clientes

```sql
INSERT INTO sync_jobs (
  company_id,
  entity_type,
  entity_id,
  action,
  payload_json,
  status
) VALUES (
  'company-uuid',
  'customer',
  'cliente-uuid',
  'upsert',
  '{"name": "...", "external": {"id": "..."}, ...}',
  'pending'
);
```

---

## 🔑 Resumo Executivo

> **O cliente nasce no WAI, é identificado pelo ID do WAI (`external.id`) e sincronizado com o Field via API, com endereço geolocalizado obrigatório. O Field nunca é fonte de verdade para identidade.**

---

## Referências

- [Field Control API - Customers](https://developers.fieldcontrol.com.br/)
- [WAI Observer Architecture](./WAI_OBSERVER_AI_ARCHITECTURE.md)
- [Scripts IA WAI](./SCRIPTS_IA_WAI.md)
