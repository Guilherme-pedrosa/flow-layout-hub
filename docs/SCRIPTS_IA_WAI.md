# 🤖 Documentação Completa das IAs do WAI ERP

Este documento detalha todos os scripts, prompts e funcionamento das Inteligências Artificiais implementadas no sistema WAI ERP.

---

## 📋 Índice

1. [Financial AI - Assistente Financeiro Inteligente](#1-financial-ai---assistente-financeiro-inteligente)
2. [Analyze and Generate Insights - Gerador de Insights Automático](#2-analyze-and-generate-insights---gerador-de-insights-automático)
3. [Monitor Financial Health - Monitor de Saúde Financeira](#3-monitor-financial-health---monitor-de-saúde-financeira)
4. [Monitor Stock Levels - Monitor de Níveis de Estoque](#4-monitor-stock-levels---monitor-de-níveis-de-estoque)
5. [CFO Cost Monitoring - Monitoramento de Custos CFO](#5-cfo-cost-monitoring---monitoramento-de-custos-cfo)
6. [CFO Efficiency Analysis - Análise de Eficiência CFO](#6-cfo-efficiency-analysis---análise-de-eficiência-cfo)
7. [CFO Profitability Check - Verificação de Rentabilidade CFO](#7-cfo-profitability-check---verificação-de-rentabilidade-cfo)
8. [Suggest NCM - Sugestor de NCM](#8-suggest-ncm---sugestor-de-ncm)
9. [Validate NCM - Validador de NCM](#9-validate-ncm---validador-de-ncm)
10. [Demand Analysis - Análise de Demanda](#10-demand-analysis---análise-de-demanda)
11. [Purchase Suggestion - Sugestão de Compra](#11-purchase-suggestion---sugestão-de-compra)
12. [Reconciliation Engine - Motor de Conciliação Bancária](#12-reconciliation-engine---motor-de-conciliação-bancária)
13. [Find Product Matches - Buscador de Produtos Similares](#13-find-product-matches---buscador-de-produtos-similares)
14. [Analyze Margin Impact - Análise de Impacto na Margem](#14-analyze-margin-impact---análise-de-impacto-na-margem)

---

## 1. Financial AI - Assistente Financeiro Inteligente

**Arquivo:** `supabase/functions/financial-ai/index.ts`

### 📝 Descrição
Assistente de IA conversacional com acesso completo a todos os dados do sistema ERP. Permite análises, consultas e insights em tempo real através de chat.

### 🔧 Modelo Utilizado
- **OpenAI GPT-4.1-mini** (`gpt-4.1-mini-2025-04-14`)

### 📊 Dados Acessados
O sistema busca dados de 7 funções SQL otimizadas:
1. `ai_get_financial_dashboard` - Dashboard financeiro
2. `ai_get_clientes_analysis` - Análise de clientes
3. `ai_get_produtos_analysis` - Análise de produtos
4. `ai_get_os_analysis` - Análise de ordens de serviço
5. `ai_get_vendas_analysis` - Análise de vendas (30 dias)
6. `ai_get_compras_analysis` - Análise de compras
7. `ai_get_inadimplencia_analysis` - Análise de inadimplência

Além de dados detalhados de:
- Contas a pagar vencidas (top 20)
- Contas a receber vencidas (top 20)
- Produtos com estoque baixo
- Últimas 50 transações bancárias

### 💬 System Prompt Completo

```
Você é um assistente de inteligência artificial com ACESSO COMPLETO a todos os dados do sistema ERP. Você pode analisar:

## MÓDULOS DISPONÍVEIS
1. **Financeiro**: Contas a pagar, contas a receber, transações bancárias, plano de contas, centros de custo
2. **Compras**: Pedidos de compra, recebimento de mercadorias, fornecedores
3. **Vendas**: Vendas, orçamentos, clientes, comissões
4. **Estoque**: Produtos, movimentações, saldos, localizações
5. **Fiscal**: Notas fiscais, impostos, CFOP
6. **Serviços**: Ordens de serviço, atendimentos

## SUAS CAPACIDADES
1. **Detecção de Fraude e Anomalias**:
   - Identificar pagamentos duplicados ou suspeitos
   - Detectar padrões incomuns de gastos
   - Alertar sobre fornecedores/clientes com comportamento atípico
   - Identificar valores fora do padrão histórico

2. **Auditoria de Lançamentos**:
   - Verificar categorização no plano de contas
   - Identificar lançamentos mal categorizados
   - Verificar consistência de dados entre módulos

3. **Análise de Fornecedores e Clientes**:
   - Identificar concentração de gastos/receitas
   - Detectar dependência excessiva
   - Sugerir oportunidades de negociação
   - Analisar histórico de pagamentos/recebimentos

4. **Análise de Fluxo de Caixa**:
   - Projetar saldo futuro
   - Identificar períodos críticos
   - Alertar sobre vencimentos importantes
   - Sugerir priorização de pagamentos

5. **Gestão de Estoque**:
   - Identificar produtos com estoque baixo
   - Detectar produtos com margem negativa
   - Analisar giro de estoque
   - Sugerir reposição

6. **Análise de Vendas**:
   - Identificar tendências
   - Analisar performance por cliente/produto
   - Detectar oportunidades de cross-sell/up-sell

## REGRAS DE RESPOSTA
- Seja direto e objetivo
- Use dados concretos dos contextos fornecidos
- Destaque riscos (🚨 crítico, ⚠️ atenção) e oportunidades (✅ ok, 💡 sugestão)
- Formate em Markdown para legibilidade
- Quando relevante, sugira ações práticas
- Foque no que o prompt/pergunta do usuário solicita
```

### ⚙️ Configurações
- **Streaming:** Habilitado (exceto para sugestões de CFOP)
- **Max Tokens:** 4096
- **Autenticação:** JWT obrigatório
- **Verificação de acesso à empresa:** Sim

---

## 2. Analyze and Generate Insights - Gerador de Insights Automático

**Arquivo:** `supabase/functions/analyze-and-generate-insights/index.ts`

### 📝 Descrição
Função que analisa automaticamente todos os dados da empresa e gera insights acionáveis. Executada periodicamente ou sob demanda.

### 🔧 Modelo Utilizado
- **OpenAI GPT-4.1-mini** (`gpt-4.1-mini-2025-04-14`)
- **Fallback:** Insights básicos sem IA se API key não configurada

### 📊 Análises Realizadas

#### Estoque e Produtos
| Análise | Descrição |
|---------|-----------|
| Estoque negativo | Produtos com quantidade < 0 |
| Estoque baixo | Produtos abaixo do mínimo |
| Excesso de estoque | Produtos acima do máximo |
| Produtos sem giro | Sem movimentação em 90 dias |
| Margem negativa | Preço de venda < custo |
| Sem custo cadastrado | Produtos sem preço de custo |
| Sem preço de venda | Produtos sem preço definido |
| Curva ABC | Classificação por valor em estoque |

#### Financeiro
- Contas a pagar vencidas
- Contas a receber vencidas
- Saldo bancário total
- Títulos pendentes

#### Vendas
- Vendas dos últimos 30 dias
- Top 5 produtos vendidos

### 💬 Prompt de Geração de Insights

```
Com base nos dados abaixo, gere de 3 a 5 insights ACIONÁVEIS para a empresa. 

Cada insight deve ter:
- type: "critical" | "warning" | "info" | "success"
- category: "stock" | "financial" | "sales" | "purchases"
- mode: "auditora" | "cfo_bot" | "especialista" | "executora"
- title: título curto e direto (máx 50 caracteres)
- message: mensagem explicativa com dados concretos (máx 200 caracteres)
- action_label: texto do botão de ação (máx 20 caracteres)
- action_url: uma das URLs: /ajustes, /solicitacoes, /contas-pagar, /contas-receber, /saldo-estoque, /vendas, /produtos
- priority: 1-10 (10 = mais urgente)

REGRAS:
- Priorize problemas CRÍTICOS primeiro
- Seja ESPECÍFICO com números reais dos dados
- Sugira AÇÕES concretas
- Se não houver problemas, gere insights de sucesso ou oportunidades

Responda APENAS com um JSON array de insights, sem markdown.
```

### 📈 Contexto Enviado à IA

```
## ANÁLISE DA EMPRESA ({data})

### ESTOQUE E PRODUTOS - VISÃO GERAL
- Total de produtos ativos: {X}
- Valor total em estoque (custo): R$ {X}
- Valor potencial de venda: R$ {X}
- Margem média dos produtos: {X}%

### PROBLEMAS DE ESTOQUE
- Produtos com estoque negativo: {X}
- Produtos abaixo do mínimo: {X}
- Produtos acima do máximo (excesso): {X}
- Produtos sem giro (90 dias): {X} (R$ {X} empatado)

### PROBLEMAS DE PRECIFICAÇÃO E CUSTO
- Produtos SEM custo cadastrado: {X}
- Produtos SEM preço de venda: {X}
- Produtos com margem NEGATIVA: {X}
- Produtos com margem muito baixa (<10%): {X}

### CURVA ABC (por valor em estoque)
- Curva A (80% do valor): {X} produtos
- Curva B (15% do valor): {X} produtos
- Curva C (5% do valor): {X} produtos

### FINANCEIRO
- Saldo bancário total: R$ {X}
- Contas a pagar vencidas: {X} (R$ {X})
- Contas a receber vencidas: {X} (R$ {X})

### VENDAS (últimos 30 dias)
- Total de vendas: {X}
- Valor total: R$ {X}
```

---

## 3. Monitor Financial Health - Monitor de Saúde Financeira

**Arquivo:** `supabase/functions/monitor-financial-health/index.ts`

### 📝 Descrição
Monitor automático que verifica a saúde financeira de todas as empresas ativas e gera alertas proativos.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras

### 📊 Alertas Gerados

| Tipo | Prioridade | Condição |
|------|------------|----------|
| **Contas Vencidas** | 10 (crítico) | Contas a pagar vencidas hoje ou antes |
| **Vencimentos Próximos** | 5 (warning) | Contas vencendo nos próximos 7 dias |
| **Recebíveis em Atraso** | 7 (warning) | Contas a receber vencidas |
| **Risco de Caixa Negativo** | 9 (crítico) | Projeção negativa em 7 dias |
| **Conciliação Pendente** | 3 (info) | > 10 transações não conciliadas |
| **Boletos DDA Vencendo** | 6 (warning) | Boletos DDA vencendo em 3 dias |

### 📈 Estrutura de Insight Gerado

```json
{
  "company_id": "uuid",
  "type": "critical|warning|info|success",
  "category": "financial",
  "mode": "cfo_bot|auditora|executora",
  "title": "Título do alerta",
  "message": "Mensagem detalhada com valores",
  "action_label": "Texto do botão",
  "action_url": "/rota-acao",
  "priority": 1-10,
  "metadata": { /* dados adicionais */ }
}
```

---

## 4. Monitor Stock Levels - Monitor de Níveis de Estoque

**Arquivo:** `supabase/functions/monitor-stock-levels/index.ts`

### 📝 Descrição
Monitor automático de níveis de estoque que identifica problemas e gera alertas.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras

### 📊 Alertas Gerados

| Tipo | Prioridade | Condição | Modo IA |
|------|------------|----------|---------|
| **Estoque Negativo** | 10 | quantidade < 0 | auditora |
| **Abaixo do Mínimo** | 7 | quantidade <= min_stock | especialista |
| **Capital Parado** | 4 | quantidade > max_stock | cfo_bot |
| **Produtos Sem Giro** | 5 | Sem movimentação 90 dias | especialista |

### 📈 Cálculos Realizados

- **Valor de reposição:** `(min_stock - current_stock) × cost_price`
- **Valor em excesso:** `(current_stock - max_stock) × cost_price`
- **Valor parado:** `current_stock × cost_price` (produtos sem giro)

---

## 5. CFO Cost Monitoring - Monitoramento de Custos CFO

**Arquivo:** `supabase/functions/cfo-cost-monitoring/index.ts`

### 📝 Descrição
Agente CFO que monitora variações de custos e identifica aumentos significativos.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras
- **Threshold:** 20% de aumento considerado significativo

### 📊 Análises Realizadas

1. **Comparação de Gastos (30 dias)**
   - Compara últimos 30 dias com 30 dias anteriores
   - Alerta se aumento > 20%
   - Severidade crítica se > 50%

2. **Análise por Categoria**
   - Agrupa gastos por plano de contas
   - Identifica categorias com aumento > 20%
   - Exige valor mínimo de R$ 1.000

3. **Top Fornecedores**
   - Identifica os 3 maiores fornecedores
   - Alerta informativo se total > R$ 10.000

### 📈 Estrutura de Alerta

```json
{
  "company_id": "uuid",
  "alert_type": "cost_increase",
  "severity": "critical|warning|info",
  "title": "Aumento significativo nos gastos",
  "message": "Os gastos dos últimos 30 dias (R$ X) aumentaram Y% em relação ao período anterior (R$ Z).",
  "context_data": {
    "current_period_total": 10000,
    "previous_period_total": 8000,
    "variation_percent": 25,
    "period": "30 dias"
  }
}
```

---

## 6. CFO Efficiency Analysis - Análise de Eficiência CFO

**Arquivo:** `supabase/functions/cfo-efficiency-analysis/index.ts`

### 📝 Descrição
Agente CFO que analisa eficiência operacional, tempo de conclusão e conversões.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras

### 📊 Análises Realizadas

1. **Tempo de Conclusão de OS**
   - Calcula tempo médio de conclusão em horas
   - Compara com média histórica (90 dias)
   - Alerta se aumento > 20% e tempo > 24h

2. **Ticket Médio de OS**
   - Calcula valor médio por OS
   - Compara com média histórica
   - Alerta se queda > 15%

3. **Taxa de Conversão de Orçamentos**
   - Calcula % de orçamentos convertidos em vendas
   - Alerta se taxa < 30% (com mínimo de 10 registros)

4. **Produtos Sem Giro no Estoque**
   - Identifica produtos sem movimentação em 90 dias
   - Calcula valor total parado
   - Alerta se valor > R$ 5.000

---

## 7. CFO Profitability Check - Verificação de Rentabilidade CFO

**Arquivo:** `supabase/functions/cfo-profitability-check/index.ts`

### 📝 Descrição
Agente CFO que verifica rentabilidade de vendas e OS em tempo real.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras
- **Threshold:** 15% margem mínima aceitável

### 📊 Análises Realizadas

1. **Vendas Concluídas (última hora)**
   - Calcula margem real por venda
   - Alerta se margem < 15%
   - Severidade crítica se margem < 5%

2. **OS Concluídas (última hora)**
   - Calcula margem considerando produtos e serviços
   - Serviços: assume 80% de margem (custo = 20%)
   - Alerta se margem < 15%

### 📈 Cálculo de Margem

```
Margem (%) = ((Receita Total - Custo Total) / Receita Total) × 100
```

---

## 8. Suggest NCM - Sugestor de NCM

**Arquivo:** `supabase/functions/suggest-ncm/index.ts`

### 📝 Descrição
Sugere o código NCM (Nomenclatura Comum do Mercosul) mais adequado para um produto.

### 🔧 Modelo Utilizado
- **OpenAI GPT-4.1-mini** (`gpt-4.1-mini-2025-04-14`)
- **Temperature:** 0.3 (mais determinístico)

### 💬 System Prompt

```
Você é um especialista em classificação fiscal de mercadorias (NCM) brasileiro.
Sua tarefa é sugerir o NCM mais adequado para o produto descrito.

REGRAS:
- O NCM deve ter exatamente 8 dígitos
- Forneça até 3 sugestões ordenadas por relevância
- Inclua a descrição oficial do NCM
- Explique brevemente por que cada NCM foi sugerido
- Se houver dúvida, indique qual consultar um contador

Responda APENAS em formato JSON válido, sem markdown:
{
  "suggestions": [
    {
      "ncm": "00000000",
      "description": "Descrição oficial do NCM",
      "confidence": "alta|média|baixa",
      "reason": "Motivo da sugestão"
    }
  ],
  "notes": "Observações adicionais se necessário"
}
```

### 📥 Entrada
- `productDescription` (obrigatório): Descrição do produto
- `productCategory` (opcional): Categoria do produto

### 📤 Saída
```json
{
  "suggestions": [
    {
      "ncm": "84713012",
      "description": "Máquinas automáticas para processamento de dados, portáteis",
      "confidence": "alta",
      "reason": "Produto é um notebook/laptop"
    }
  ],
  "notes": "Consulte um contador para confirmar"
}
```

---

## 9. Validate NCM - Validador de NCM

**Arquivo:** `supabase/functions/validate-ncm/index.ts`

### 📝 Descrição
Valida se um código NCM é válido e adequado para o produto.

### 🔧 Modelo Utilizado
- **OpenAI GPT-4.1-mini** (`gpt-4.1-mini-2025-04-14`)
- **Temperature:** 0.3

### 💬 Prompt de Validação

```
Você é um especialista em classificação fiscal NCM (Nomenclatura Comum do Mercosul) brasileira.

Analise o código NCM: {ncm}
Descrição do produto: {productDescription}

Retorne APENAS um JSON válido com a seguinte estrutura (sem markdown, sem código, apenas o JSON puro):
{
  "valid": true ou false,
  "ncmDescription": "descrição oficial do NCM se válido",
  "suggestion": "sugestão de NCM correto se o informado parecer errado para o produto",
  "confidence": "alta", "média" ou "baixa",
  "notes": "observações relevantes sobre a classificação"
}

Exemplos de NCMs válidos:
- 84713012: Máquinas automáticas para processamento de dados, portáteis
- 39269090: Outras obras de plástico
- 85234920: CDs para leitura por sistema a laser

Se o NCM não existir ou parecer inválido, retorne valid: false com uma sugestão apropriada.
```

### 📥 Entrada
- `ncm` (obrigatório): Código NCM a validar
- `productDescription` (opcional): Descrição do produto

### 📤 Saída
```json
{
  "valid": true,
  "ncm": "84713012",
  "ncmDescription": "Máquinas automáticas para processamento de dados, portáteis",
  "confidence": "alta",
  "notes": "NCM adequado para notebooks e laptops"
}
```

---

## 10. Demand Analysis - Análise de Demanda

**Arquivo:** `supabase/functions/demand-analysis/index.ts`

### 📝 Descrição
Analisa vendas e ordens de serviço aprovadas que não têm saldo em estoque.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras

### 📊 Dados Analisados

1. **Ordens de Serviço Aprovadas**
   - Busca OS com status que tem `stock_behavior = 'reserve'`
   - Lista itens de produtos por OS

2. **Vendas Aprovadas**
   - Busca vendas com status que tem `stock_behavior = 'reserve'`
   - Lista itens de produtos por venda

3. **Histórico de Compras**
   - Último fornecedor por produto
   - Último preço de compra
   - Data da última compra

### 📤 Saída

```json
{
  "success": true,
  "data": {
    "demands": [
      {
        "id": "uuid",
        "source_type": "service_order|sale",
        "source_number": 123,
        "client_name": "Nome do Cliente",
        "product_code": "PROD001",
        "product_description": "Descrição",
        "quantity_needed": 10,
        "current_stock": 2,
        "stock_shortage": 8,
        "last_supplier_name": "Fornecedor X",
        "last_purchase_price": 100.00,
        "status_name": "Aprovada"
      }
    ],
    "product_summary": [
      {
        "product_id": "uuid",
        "product_code": "PROD001",
        "total_demand": 50,
        "current_stock": 10,
        "stock_shortage": 40,
        "sources_count": 5
      }
    ],
    "summary": {
      "total_demands": 100,
      "os_count": 60,
      "sale_count": 40,
      "unique_products": 25,
      "estimated_purchase_value": 15000.00
    }
  }
}
```

---

## 11. Purchase Suggestion - Sugestão de Compra

**Arquivo:** `supabase/functions/purchase-suggestion/index.ts`

### 📝 Descrição
Analisa estoque e histórico de vendas para sugerir compras.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras

### 📊 Análises Realizadas

1. **Estoque Atual vs Mínimo**
2. **Histórico de Vendas (90 dias)**
3. **Média Diária de Vendas**
4. **Dias até Ruptura**
5. **Fornecedores Cadastrados**

### 📈 Classificação de Prioridade

| Prioridade | Condição |
|------------|----------|
| **Critical** | Estoque zerado OU abaixo do mínimo |
| **High** | Ruptura prevista em ≤ 7 dias |
| **Medium** | Ruptura prevista em ≤ 14 dias |
| **Low** | Estoque próximo ao ponto de reposição |

### 📤 Saída

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "product_id": "uuid",
        "code": "PROD001",
        "description": "Produto X",
        "current_stock": 5,
        "min_stock": 10,
        "max_stock": 30,
        "avg_daily_sales": 2.5,
        "days_until_stockout": 2,
        "suggested_quantity": 25,
        "priority": "critical",
        "reasoning": "Estoque abaixo do mínimo (5 < 10)",
        "suppliers": [
          { "name": "Fornecedor A", "last_price": 50.00, "lead_time_days": 7 }
        ]
      }
    ],
    "summary": {
      "total_products_analyzed": 500,
      "critical_count": 10,
      "high_count": 25,
      "medium_count": 50,
      "low_count": 30,
      "total_suggestions": 115
    },
    "requires_human_approval": true,
    "auto_created_orders": 0
  }
}
```

**⚠️ IMPORTANTE:** O sistema NUNCA cria pedidos automaticamente. Todas as sugestões requerem aprovação humana.

---

## 12. Reconciliation Engine - Motor de Conciliação Bancária

**Arquivo:** `supabase/functions/reconciliation-engine/index.ts`

### 📝 Descrição
Motor inteligente de conciliação bancária que sugere matches entre transações e títulos.

### 🔧 Tecnologia
- **Sem IA externa** - Algoritmos de matching sofisticados

### 📊 Estratégias de Matching

#### 1. Match por Nosso Número (Boletos)
- Busca NSU ou descrição contendo nosso número
- Confiança: **99%**

#### 2. Match por Nome Extraído
- Extrai nome de pessoa/empresa da descrição do PIX/TED
- Padrões reconhecidos:
  - `PIX ENVIADO - Cp: 123-NOME`
  - `PIX RECEBIDO DE NOME`
  - `TED 123 NOME`
  - `TRANSF PIX PARA NOME`
  - `PAG*NOME`

#### 3. Match 1:1 (Exato)
- Uma transação = um título
- Considera tolerância de valor e data

#### 4. Match 1:N (Aglutinação)
- Uma transação = vários títulos
- Usa algoritmo de backtracking para encontrar combinações

#### 5. Match N:1 (Parcelamento)
- Várias transações = um título

### 📈 Cálculo de Confiança

| Tipo de Match | Score Base |
|---------------|------------|
| Nosso Número | 99% |
| Valor exato + Nome 90%+ | 98% |
| Valor exato + Nome 70%+ | 92% |
| Valor exato + Nome 50%+ | 85% |
| Aglutinação perfeita | 85% |
| Apenas valor | 50% |

**Penalidades:**
- -2 pontos por dia de vencimento futuro
- +bonus para títulos vencidos (sendo pagos)

### 📤 Saída

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "transaction_id": "uuid",
        "transaction": { /* dados da transação */ },
        "entries": [
          {
            "id": "uuid",
            "type": "payable|receivable",
            "amount": 1000.00,
            "amount_used": 1000.00,
            "entity_name": "Fornecedor X",
            "due_date": "2024-01-15",
            "document_number": "NF123"
          }
        ],
        "confidence_score": 95,
        "confidence_level": "high|medium|low",
        "match_reasons": ["✓ Valor exato", "✓ Nome corresponde"],
        "match_type": "exact_1_1|aggregation_1_n|name_match|nosso_numero|value_only",
        "total_matched": 1000.00,
        "difference": 0.00,
        "requires_review": false,
        "extracted_name": "FORNECEDOR X LTDA",
        "matched_entity": "Fornecedor X"
      }
    ],
    "unmatched": [ /* transações sem sugestão */ ],
    "summary": {
      "total_transactions": 100,
      "suggestions_count": 75,
      "high_confidence_count": 50,
      "unmatched_count": 25
    }
  }
}
```

**⚠️ IMPORTANTE:** O sistema NUNCA executa conciliação sem confirmação do usuário.

---

## 13. Find Product Matches - Buscador de Produtos Similares

**Arquivo:** `supabase/functions/find-product-matches/index.ts`

### 📝 Descrição
Busca produtos similares por código ou descrição usando algoritmos de similaridade.

### 🔧 Tecnologia
- **Sem IA externa** - Algoritmos de string matching

### 📊 Estratégias de Busca

1. **Match Exato de Código**
   - Busca código idêntico
   - Score: 100%

2. **Match Normalizado de Código**
   - Remove zeros à esquerda e caracteres especiais
   - Score: 95% (exato) ou 85% (parcial)

3. **Similaridade de Descrição**
   - **Levenshtein Distance:** Calcula distância de edição
   - **Keyword Matching:** Compara palavras-chave importantes
   - Score máximo: 90%

### 📈 Normalização de Código

```javascript
// Remove caracteres especiais e zeros à esquerda
"00-ABC-123" → "ABC123"
"0001234" → "1234"
```

### 📈 Extração de Keywords

```javascript
// Stop words removidas (pt-BR):
['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'um', 'uma', 
 'para', 'por', 'com', 'sem', 'a', 'o', 'e', 'ou', 'que']

// Exemplo:
"Computador Desktop Dell i7 16GB" → ['computador', 'desktop', 'dell', '16gb']
```

### 📤 Saída

```json
{
  "matches": [
    {
      "id": "uuid",
      "code": "PROD001",
      "description": "Computador Desktop Dell",
      "score": 95,
      "matchType": "exact_code|normalized_code|description_similarity"
    }
  ]
}
```

---

## 14. Analyze Margin Impact - Análise de Impacto na Margem

**Arquivo:** `supabase/functions/analyze-margin-impact/index.ts`

### 📝 Descrição
Analisa o impacto de novos custos de compra na margem de vendas/OS pendentes.

### 🔧 Tecnologia
- **Sem IA externa** - Lógica baseada em regras
- **Threshold:** 20% margem mínima

### 📊 Fluxo de Análise

1. Recebe itens do pedido de compra com novos custos
2. Busca vendas "Aguardando Peças" com esses produtos
3. Busca OS com esses produtos
4. Calcula margem anterior e nova
5. Gera alertas se margem cair abaixo de 20%

### 📈 Cálculo de Margem

```
Margem Anterior = ((Preço Venda - Custo Anterior) / Preço Venda) × 100
Margem Nova = ((Preço Venda - Novo Custo) / Preço Venda) × 100
Perda Potencial = (Novo Custo - Custo Anterior) × Quantidade
```

### 📤 Saída

```json
{
  "success": true,
  "alertsCreated": 5,
  "message": "5 alertas de impacto na margem criados"
}
```

### 📊 Estrutura do Alerta

```json
{
  "company_id": "uuid",
  "product_id": "uuid",
  "purchase_order_id": "uuid",
  "reference_type": "sale|service_order",
  "reference_id": "uuid",
  "reference_number": "V-001",
  "old_margin_percent": 25.0,
  "new_margin_percent": 12.0,
  "old_cost": 100.00,
  "new_cost": 120.00,
  "sale_price": 150.00,
  "quantity": 10,
  "potential_loss": 200.00,
  "status": "pending"
}
```

---

## 📊 Resumo dos Modos de IA

| Modo | Descrição | Cor |
|------|-----------|-----|
| **auditora** | Detecção de problemas e inconsistências | Vermelho |
| **cfo_bot** | Análises financeiras e de custos | Azul |
| **especialista** | Sugestões de melhoria e otimização | Verde |
| **executora** | Ações automatizáveis | Amarelo |

---

## 🔐 Segurança

- Todas as funções requerem autenticação JWT (exceto onde especificado)
- Verificação de acesso à empresa antes de retornar dados
- Nenhuma ação é executada automaticamente sem confirmação do usuário
- Dados sensíveis são logados apenas em nível de debug

---

## 📝 Notas Importantes

1. **Modelo Padrão:** GPT-4.1-mini para todas as funções com IA
2. **Temperature:** 0.3 (mais determinístico) para todas as funções
3. **Fallbacks:** Todas as funções têm tratamento de erro e fallbacks básicos
4. **Rate Limiting:** Tratamento de erros 429 (rate limit) e 402 (créditos)
5. **Duplicação:** Verificação de insights duplicados nas últimas 24h

---

*Documentação gerada automaticamente - WAI ERP v2.0*
