# WAI — Governança & Permissões

> **Versão:** 1.0  
> **Data:** 2026-01-07  
> **Status:** Produção  

---

## 🎯 Princípio Central

| Conceito | Definição |
|----------|-----------|
| **Segregação de Funções** | Nenhum usuário deve ter poder total |
| **Menor Privilégio** | Cada usuário só acessa o necessário |
| **Auditoria Completa** | Toda ação crítica deixa rastro |
| **Aprovação em Camadas** | Ações sensíveis requerem aprovação |

### ⚠️ Regra Fundamental (Imutável)

> **Permissões são controladas por roles, nunca por usuário individual.**  
> Exceções individuais **devem ser documentadas e auditadas**.

---

## 1️⃣ Estrutura de Roles

### Roles Padrão do Sistema

| Role | Descrição | Nível |
|------|-----------|-------|
| `admin` | Administrador total | Máximo |
| `gerente` | Gestão operacional e financeira | Alto |
| `financeiro` | Operações financeiras | Médio-Alto |
| `operacional` | Gestão de OS e Field | Médio |
| `tecnico` | Execução em campo | Básico |
| `viewer` | Apenas visualização | Mínimo |

### Hierarquia de Herança

```
admin
  └── gerente
        ├── financeiro
        │     └── viewer
        └── operacional
              ├── tecnico
              └── viewer
```

> Role superior **herda** permissões de roles inferiores.

---

## 2️⃣ Matriz de Permissões por Domínio

### Clientes

| Ação | admin | gerente | financeiro | operacional | tecnico | viewer |
|------|-------|---------|------------|-------------|---------|--------|
| Visualizar | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ |
| Criar | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |
| Editar | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |
| Excluir | ✔️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Alterar dados fiscais | ✔️ | ✔️ | ✔️ | ❌ | ❌ | ❌ |

### Equipamentos

| Ação | admin | gerente | financeiro | operacional | tecnico | viewer |
|------|-------|---------|------------|-------------|---------|--------|
| Visualizar | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ |
| Criar | ✔️ | ✔️ | ❌ | ✔️ | ✔️* | ❌ |
| Editar | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |
| Excluir | ✔️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Mover para outro cliente | ✔️ | ✔️ | ❌ | ❌ | ❌ | ❌ |

> *Técnico pode criar equipamento em campo (via Field), sujeito a validação.

### Ordens de Serviço

| Ação | admin | gerente | financeiro | operacional | tecnico | viewer |
|------|-------|---------|------------|-------------|---------|--------|
| Visualizar | ✔️ | ✔️ | ✔️ | ✔️ | ✔️* | ✔️ |
| Criar | ✔️ | ✔️ | ❌ | ✔️ | ✔️* | ❌ |
| Editar (não faturada) | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |
| Cancelar | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |
| Atribuir técnico | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |
| Executar (check-in/out) | ❌ | ❌ | ❌ | ❌ | ✔️ | ❌ |
| Registrar consumo | ❌ | ❌ | ❌ | ❌ | ✔️ | ❌ |

> *Técnico vê apenas suas OS atribuídas.

### Estoque

| Ação | admin | gerente | financeiro | operacional | tecnico | viewer |
|------|-------|---------|------------|-------------|---------|--------|
| Visualizar saldo | ✔️ | ✔️ | ✔️ | ✔️ | ❌ | ✔️ |
| Ajustar estoque | ✔️ | ✔️ | ❌ | ❌ | ❌ | ❌ |
| Estornar consumo | ✔️ | ✔️ | ❌ | ❌ | ❌ | ❌ |
| Autorizar estoque negativo | ✔️ | ✔️ | ❌ | ❌ | ❌ | ❌ |
| Transferir entre locais | ✔️ | ✔️ | ❌ | ✔️ | ❌ | ❌ |

### Financeiro / Faturamento

| Ação | admin | gerente | financeiro | operacional | tecnico | viewer |
|------|-------|---------|------------|-------------|---------|--------|
| Visualizar faturas | ✔️ | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Faturar OS | ✔️ | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Estornar fatura | ✔️ | ✔️** | ❌ | ❌ | ❌ | ❌ |
| Emitir NF-e/NFS-e | ✔️ | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Cancelar nota fiscal | ✔️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Baixar título recebido | ✔️ | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Aprovar pagamento (Pix) | ✔️ | ✔️ | ❌ | ❌ | ❌ | ❌ |

> **Gerente pode estornar apenas com aprovação de admin (ver fluxo de aprovação).

---

## 3️⃣ Ações que Requerem Aprovação

### Fluxo de Aprovação em Duas Camadas

| Ação | Solicitante | Aprovador | Tempo limite |
|------|-------------|-----------|--------------|
| Estornar fatura | financeiro, gerente | admin, gerente | 24h |
| Cancelar NF-e | financeiro | admin | 4h |
| Autorizar estoque negativo | operacional | gerente, admin | 2h |
| Excluir cliente | gerente | admin | 24h |
| Alterar permissões de usuário | gerente | admin | Imediato |
| Pagamento Pix > R$ 10.000 | financeiro | gerente, admin | 4h |

### Estrutura de Aprovação

```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  action_type TEXT NOT NULL,           -- 'invoice_reversal', 'nfe_cancel', etc.
  entity_type TEXT NOT NULL,           -- 'service_order', 'invoice', etc.
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',       -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL
);
```

### Fluxo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUXO DE APROVAÇÃO                             │
└─────────────────────────────────────────────────────────────────┘

  Solicitante                 Sistema                  Aprovador
       │                         │                         │
       │  1. Solicita ação       │                         │
       ├────────────────────────▶│                         │
       │                         │  2. Cria approval_request│
       │                         │  3. Notifica aprovador  │
       │                         ├────────────────────────▶│
       │                         │                         │
       │                         │         4. Analisa      │
       │                         │◀────────────────────────┤
       │                         │    (aprova/rejeita)     │
       │                         │                         │
       │  5. Executa ou bloqueia │                         │
       │◀────────────────────────┤                         │
       │                         │                         │
       │  6. Audit log gerado    │                         │
       │                         │                         │
```

---

## 4️⃣ Segregação de Funções (SoD)

### Conflitos Proibidos

| Função A | Função B | Motivo |
|----------|----------|--------|
| Criar OS | Faturar mesma OS | Evita fraude |
| Registrar consumo | Ajustar estoque | Evita manipulação |
| Solicitar pagamento | Aprovar mesmo pagamento | Evita desvio |
| Criar fornecedor | Pagar mesmo fornecedor | Evita fraude |
| Emitir nota | Cancelar mesma nota | Evita sonegação |

### Implementação

```sql
-- Verificar SoD antes de ação crítica
CREATE OR REPLACE FUNCTION check_segregation_of_duties(
  p_user_id UUID,
  p_action TEXT,
  p_entity_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_creator UUID;
BEGIN
  -- Exemplo: verificar se usuário criou a OS que está tentando faturar
  IF p_action = 'invoice_create' THEN
    SELECT created_by INTO v_creator 
    FROM ordens_servico 
    WHERE id = p_entity_id;
    
    IF v_creator = p_user_id THEN
      RETURN FALSE; -- Viola SoD
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Exceções de SoD

| Situação | Permitido? | Requisito |
|----------|------------|-----------|
| Empresa com 1 funcionário | ✔️ | Flag `sod_bypass = true` + audit |
| Admin em emergência | ✔️ | Justificativa + audit + revisão posterior |
| Teste/Homologação | ✔️ | Ambiente não-produção |

---

## 5️⃣ Alertas e Ações Ignoradas

### Quem Pode Ignorar Alertas

| Tipo de Alerta | Quem pode ignorar | Requer justificativa |
|----------------|-------------------|----------------------|
| Estoque baixo | operacional, gerente, admin | Não |
| Estoque negativo | gerente, admin | ✔️ SIM |
| Cliente inativo | operacional, gerente, admin | Não |
| Margem abaixo do mínimo | gerente, admin | ✔️ SIM |
| OS atrasada | operacional, gerente, admin | Não |
| Pagamento pendente crítico | admin | ✔️ SIM |

### Registro de Alerta Ignorado

```sql
CREATE TABLE alert_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  alert_id UUID NOT NULL,
  dismissed_by UUID NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,                         -- obrigatório para alguns tipos
  reviewed_by UUID,                    -- se alguém revisou depois
  reviewed_at TIMESTAMPTZ
);
```

---

## 6️⃣ Trilha de Auditoria

### Eventos Obrigatórios

| Categoria | Eventos |
|-----------|---------|
| **Autenticação** | login, logout, login_failed, password_changed |
| **Permissões** | role_assigned, role_removed, permission_changed |
| **Aprovações** | approval_requested, approval_granted, approval_denied |
| **Financeiro** | invoice_created, invoice_reversed, payment_approved |
| **Estoque** | stock_adjusted, stock_negative_authorized |
| **Fiscal** | nfe_issued, nfe_cancelled, nfse_issued |
| **Dados sensíveis** | client_deleted, user_deleted, bulk_export |

### Estrutura de Audit Log

```sql
-- Campos mínimos obrigatórios
{
  "id": "uuid",
  "company_id": "uuid",
  "user_id": "uuid",
  "action": "invoice_reversed",
  "entity_type": "invoice",
  "entity_id": "uuid",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T14:30:00Z",
  "metadata": {
    "reason": "Cliente solicitou cancelamento",
    "approval_id": "uuid",
    "old_value": { ... },
    "new_value": { ... }
  }
}
```

### Retenção de Logs

| Tipo | Retenção mínima | Justificativa |
|------|-----------------|---------------|
| Autenticação | 1 ano | Segurança |
| Financeiro | 5 anos | Fiscal/contábil |
| Fiscal | 5 anos | Obrigação legal |
| Operacional | 2 anos | Análise |
| Geral | 1 ano | Padrão |

---

## 7️⃣ Controle de Acesso por Empresa

### Multi-tenancy

| Regra | Implementação |
|-------|---------------|
| Isolamento total | RLS por `company_id` |
| Usuário multi-empresa | `user_companies` (tabela pivot) |
| Role por empresa | Role atribuída em cada empresa |

### Estrutura

```sql
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  role app_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);
```

### Verificação de Acesso

```sql
CREATE OR REPLACE FUNCTION has_company_role(
  p_user_id UUID,
  p_company_id UUID,
  p_role app_role
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND role >= p_role  -- hierarquia
      AND is_active = TRUE
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 8️⃣ Proibições (Anti-Patterns)

| ❌ Proibido | 💥 Consequência |
|-------------|-----------------|
| Armazenar role no localStorage | Escalação de privilégio |
| Verificar permissão só no frontend | Bypass trivial |
| Admin único sem backup | Risco operacional |
| Ignorar alerta crítico sem log | Furo de auditoria |
| Permitir auto-aprovação | Fraude |
| Role "super" que bypassa tudo | Sem controle |
| Excluir logs de auditoria | Perda de rastreabilidade |

---

## 9️⃣ Observabilidade de Segurança

### Métricas de Monitoramento

| Métrica | Threshold | Ação |
|---------|-----------|------|
| Login failed > 5/hora | Alerta | Notificar admin |
| Estorno > 3/dia | Alerta | Revisão obrigatória |
| Acesso fora de horário | Log | Análise posterior |
| Bulk export | Alerta | Notificar admin |
| Mudança de role | Alerta | Confirmar com usuário |

### Dashboard de Segurança (Recomendado)

- Últimos 10 acessos por usuário
- Ações críticas nas últimas 24h
- Aprovações pendentes
- Alertas ignorados sem justificativa
- Usuários inativos há > 30 dias

---

## 🔑 Resumo Executivo

> **O WAI implementa controle de acesso baseado em roles (RBAC) com segregação de funções. Ações críticas requerem aprovação em duas camadas. Toda operação sensível gera audit log imutável. Alertas podem ser ignorados apenas por roles autorizadas, com justificativa obrigatória quando aplicável. Nenhuma verificação de permissão acontece apenas no frontend.**

---

## Referências

- [Integração WAI-Field: Faturamento](./INTEGRACAO_WAI_FATURAMENTO.md)
- [Integração WAI-Field: OS](./INTEGRACAO_WAI_FIELD_OS.md)
- [Integração WAI-Field: Estoque](./INTEGRACAO_WAI_FIELD_ESTOQUE.md)
- [WAI Observer Architecture](./WAI_OBSERVER_AI_ARCHITECTURE.md)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
