# ROADMAP WAI → ERP PROFISSIONAL

## COMPARATIVO WAI vs GESTÃO CLICK

### MÓDULOS

| Módulo | Gestão Click | WAI | Status | Prioridade |
|--------|--------------|-----|--------|------------|
| **Dashboard** | ✅ Fluxo caixa, vendas, contas bancárias, calendário | ✅ Básico | 🟡 Melhorar | Média |
| **Cadastros** | Clientes, Fornecedores, Funcionários | ✅ Clientes, Fornecedores, Produtos, Serviços, Usuários | 🟡 Melhorar | Alta |
| **Produtos** | Cadastro, grupos, subgrupos, imagens, preços | ✅ Básico | 🟡 Melhorar | Alta |
| **Serviços** | Cadastro completo | ✅ Básico | 🟡 Melhorar | Média |
| **Orçamentos** | Criar, enviar, converter em venda | ❌ Não tem | 🔴 Criar | Alta |
| **Ordens de Serviço** | Completo com checkout | ✅ Tem | 🟡 Melhorar | Média |
| **Vendas** | PDV, vendas, histórico | ✅ Básico | 🟡 Melhorar | Alta |
| **Estoque** | Saldo, movimentações, transferências, ajustes | ✅ Básico | 🟡 Melhorar | Alta |
| **Financeiro** | Contas pagar/receber, fluxo caixa, conciliação | ✅ Avançado | 🟢 Bom | Baixa |
| **Notas Fiscais** | NF-e, NFS-e, NFC-e, MDF-e, CT-e | ❌ Não emite | 🔴 Criar | **Crítica** |
| **Contratos** | Gestão de contratos recorrentes | ❌ Não tem | 🔴 Criar | Média |
| **Atendimentos** | Chamados, tickets | ❌ Não tem | 🔴 Criar | Baixa |
| **Relatórios** | Completos por módulo | ✅ Básico | 🟡 Melhorar | Média |
| **Configurações** | Empresa, usuários, permissões, integrações | ✅ Básico | 🟡 Melhorar | Alta |
| **Multi-empresa** | Lojas, vinculação de cadastros | ✅ Básico | 🟡 Melhorar | Alta |
| **Boletos** | Emissão, personalização | ✅ Via Inter | 🟢 Bom | Baixa |
| **Integrações** | Serasa, Stone, Inter, Mercado Livre | ✅ Inter | 🟡 Expandir | Média |

---

## FUNCIONALIDADES DETALHADAS

### 1. EMISSÃO DE NOTAS FISCAIS (CRÍTICO)

**O que precisa:**
- Integração com provedor de NF (Focus NFe, Nuvem Fiscal ou NFe.io)
- Cadastro de certificado digital A1
- Configuração de série e numeração
- Emissão de NF-e (produtos)
- Emissão de NFS-e (serviços)
- Emissão de NFC-e (consumidor)
- Cancelamento e carta de correção
- Download de XML e DANFE
- Armazenamento de notas emitidas

**Tabelas necessárias:**
```sql
-- Configuração fiscal da empresa
CREATE TABLE company_fiscal_config (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  certificate_file TEXT, -- Base64 do certificado A1
  certificate_password TEXT, -- Criptografado
  nfe_serie INTEGER DEFAULT 1,
  nfe_numero INTEGER DEFAULT 1,
  nfse_serie INTEGER DEFAULT 1,
  nfse_numero INTEGER DEFAULT 1,
  nfce_serie INTEGER DEFAULT 1,
  nfce_numero INTEGER DEFAULT 1,
  ambiente VARCHAR(20) DEFAULT 'homologacao', -- homologacao ou producao
  regime_tributario VARCHAR(50),
  inscricao_municipal TEXT,
  codigo_municipio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notas fiscais emitidas
CREATE TABLE notas_fiscais_emitidas (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  tipo VARCHAR(10) NOT NULL, -- NFE, NFSE, NFCE
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  chave_acesso VARCHAR(44),
  protocolo_autorizacao TEXT,
  data_emissao TIMESTAMPTZ,
  valor_total DECIMAL(15,2),
  destinatario_id UUID REFERENCES pessoas(id),
  xml_content TEXT,
  pdf_url TEXT,
  status VARCHAR(20), -- autorizada, cancelada, rejeitada
  sale_id UUID REFERENCES sales(id),
  service_order_id UUID REFERENCES service_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. ORÇAMENTOS

**O que precisa:**
- Criar orçamento com produtos/serviços
- Enviar por e-mail/WhatsApp
- Link público para cliente visualizar
- Converter orçamento em venda
- Histórico de orçamentos por cliente

**Tabelas necessárias:**
```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  cliente_id UUID REFERENCES pessoas(id),
  numero INTEGER,
  data_validade DATE,
  status VARCHAR(20), -- rascunho, enviado, aprovado, rejeitado, convertido
  valor_total DECIMAL(15,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quotation_items (
  id UUID PRIMARY KEY,
  quotation_id UUID REFERENCES quotations(id),
  product_id UUID REFERENCES products(id),
  service_id UUID REFERENCES services(id),
  quantidade DECIMAL(15,4),
  valor_unitario DECIMAL(15,2),
  desconto DECIMAL(15,2),
  valor_total DECIMAL(15,2)
);
```

---

### 3. INTEGRAÇÕES ENTRE PÁGINAS

**Links clicáveis que precisam funcionar:**

| De | Para | Ação |
|----|------|------|
| Dashboard "A receber hoje" | Contas a Receber filtrado | Clicar abre filtrado por vencimento hoje |
| Dashboard "A pagar hoje" | Contas a Pagar filtrado | Clicar abre filtrado por vencimento hoje |
| Pedido de Compra | Fornecedor | Clicar no nome abre cadastro do fornecedor |
| Venda | Cliente | Clicar no nome abre cadastro do cliente |
| Contas a Pagar | Pedido de Compra | Clicar no pedido abre o pedido |
| Contas a Receber | Venda | Clicar na venda abre a venda |
| Produto | Movimentações | Ver histórico de movimentações do produto |
| Cliente | Histórico | Ver todas as vendas/OS do cliente |
| Fornecedor | Histórico | Ver todos os pedidos do fornecedor |

---

### 4. SEGURANÇA

**O que precisa:**

| Funcionalidade | Status | Prioridade |
|----------------|--------|------------|
| Autenticação 2FA | ❌ | Alta |
| Logs de auditoria | ✅ Básico | Melhorar |
| Permissões granulares | ❌ | Alta |
| Sessões ativas | ❌ | Média |
| Bloqueio por tentativas | ❌ | Alta |
| Política de senhas | ❌ | Média |
| Backup automático | ✅ Supabase | OK |
| HTTPS | ✅ | OK |
| RLS (Row Level Security) | ✅ | OK |

**Tabela de permissões:**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- ex: 'financeiro.pagar.criar'
  description TEXT,
  module VARCHAR(50) -- financeiro, vendas, estoque, etc
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id)
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  company_id UUID REFERENCES companies(id) -- permissão por empresa
);
```

---

### 5. IA ONIPRESENTE

**Conceito:** Assistente de IA disponível em todas as telas, contextualizado.

**Implementação:**

```tsx
// Componente global de IA
<AIAssistant 
  context={{
    page: "contas-pagar",
    data: payables,
    filters: currentFilters,
    user: currentUser
  }}
  capabilities={[
    "analisar_dados",
    "sugerir_acoes",
    "responder_perguntas",
    "executar_tarefas"
  ]}
/>
```

**Funcionalidades por módulo:**

| Módulo | IA pode fazer |
|--------|---------------|
| **Dashboard** | Resumo do dia, alertas, previsões |
| **Financeiro** | Análise de fluxo, sugestões de pagamento, alertas de vencimento |
| **Vendas** | Sugestões de produtos, análise de cliente, previsão de vendas |
| **Estoque** | Alertas de estoque baixo, sugestões de compra |
| **Compras** | Auditoria de pedidos, comparação de preços, alertas |
| **OS** | Sugestões de serviços, análise de tempo |
| **Cadastros** | Validação de dados, enriquecimento de cadastro |
| **Relatórios** | Geração automática, insights, exportação |

**Edge Function unificada:**
```typescript
// supabase/functions/ai-assistant/index.ts
export async function handleAIRequest(req: {
  context: string;
  data: any;
  question?: string;
  action?: string;
}) {
  const systemPrompt = `
    Você é o assistente de IA do WAI ERP.
    Contexto atual: ${req.context}
    Dados disponíveis: ${JSON.stringify(req.data)}
    
    Você pode:
    1. Analisar dados e fornecer insights
    2. Responder perguntas sobre os dados
    3. Sugerir ações baseadas no contexto
    4. Executar tarefas quando solicitado
    
    Seja conciso, profissional e proativo.
  `;
  
  // Chamar OpenAI/Gemini
}
```

---

## PRIORIZAÇÃO (ROADMAP)

### FASE 1 - FUNDAÇÃO (1-2 semanas)
- [x] SearchableSelect em todos os selects
- [x] Diálogo de confirmação ao trocar empresa
- [ ] Melhorar cadastro de clientes (CEP, validação)
- [ ] Links clicáveis entre páginas
- [ ] Permissões básicas por módulo

### FASE 2 - CORE (2-4 semanas)
- [ ] Emissão de NF-e (integração com provedor)
- [ ] Orçamentos (criar, enviar, converter)
- [ ] Melhorar módulo de Vendas
- [ ] Melhorar módulo de Estoque
- [ ] IA onipresente (componente global)

### FASE 3 - EXPANSÃO (4-8 semanas)
- [ ] Emissão de NFS-e e NFC-e
- [ ] Contratos recorrentes
- [ ] PDV (ponto de venda)
- [ ] Relatórios avançados
- [ ] Integrações (Mercado Livre, Stone, etc)

### FASE 4 - PROFISSIONALIZAÇÃO (8-12 semanas)
- [ ] 2FA e segurança avançada
- [ ] API pública
- [ ] Aplicativo mobile
- [ ] Módulo de produção
- [ ] Indicadores e BI

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Substituir todos os selects** pelo SearchableSelect
2. **Adicionar busca por CEP** no cadastro de clientes
3. **Pesquisar e escolher provedor de NF** (Focus NFe vs Nuvem Fiscal)
4. **Criar componente de IA global** para todas as telas
5. **Implementar links clicáveis** entre páginas
