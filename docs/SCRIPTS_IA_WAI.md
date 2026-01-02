# 🤖 Scripts e Prompts das IAs do WAI ERP

Este documento contém todos os códigos e prompts de IA utilizados no sistema WAI ERP.

---

## 1. Financial AI (Chat Financeiro)

**Arquivo:** `supabase/functions/financial-ai/index.ts`

**Modelo:** `gpt-4.1-mini-2025-04-14`

**System Prompt:**
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

**Contexto fornecido via RPCs:**
- `ai_get_financial_dashboard` - Resumo financeiro
- `ai_get_clientes_analysis` - Análise de clientes
- `ai_get_produtos_analysis` - Análise de produtos
- `ai_get_os_analysis` - Análise de ordens de serviço
- `ai_get_vendas_analysis` - Análise de vendas (30 dias)
- `ai_get_compras_analysis` - Análise de compras
- `ai_get_inadimplencia_analysis` - Análise de inadimplência

---

## 2. Analyze and Generate Insights

**Arquivo:** `supabase/functions/analyze-and-generate-insights/index.ts`

**Modelo:** `gpt-4.1-mini-2025-04-14`

**System Prompt:**
```
Você é um analista de negócios especializado em ERP. Responda APENAS com JSON válido, sem markdown.
```

**User Prompt:**
```
Com base nos dados abaixo, gere de 3 a 5 insights ACIONÁVEIS para a empresa. 
${categoryFocus}
Cada insight deve ter:
- type: "critical" | "warning" | "info" | "success"
- category: "${category || 'stock" | "financial" | "sales" | "purchases'}"
- mode: "auditora" | "cfo_bot" | "especialista" | "executora"
- title: título curto e direto (máx 50 caracteres)
- message: mensagem explicativa com dados concretos (máx 200 caracteres)
- action_label: texto do botão de ação (máx 20 caracteres)
- action_url: uma das URLs: /ajustes, /solicitacoes, /contas-pagar, /contas-receber, /saldo-estoque, /vendas, /produtos
- priority: 1-10 (10 = mais urgente)

REGRAS:
${categoryRule}
- Priorize problemas CRÍTICOS primeiro
- Seja ESPECÍFICO com números reais dos dados
- Sugira AÇÕES concretas
- Se não houver problemas, gere insights de sucesso ou oportunidades

## ANÁLISE DA EMPRESA (${today})

### ESTOQUE E PRODUTOS - VISÃO GERAL
- Total de produtos ativos: ${activeProducts.length}
- Valor total em estoque (custo): R$ ${totalStockValue.toFixed(2)}
- Valor potencial de venda: R$ ${totalStockSaleValue.toFixed(2)}
- Margem média dos produtos: ${avgMarginPercent.toFixed(1)}%

### PROBLEMAS DE ESTOQUE
- Produtos com estoque negativo: ${negativeStock.length}
- Produtos abaixo do mínimo: ${lowStock.length}
- Produtos acima do máximo (excesso): ${overStock.length}
- Produtos sem giro (90 dias): ${stagnantProducts.length}

### PROBLEMAS DE PRECIFICAÇÃO E CUSTO
- Produtos SEM custo cadastrado: ${noCostProducts.length}
- Produtos SEM preço de venda: ${noSalePriceProducts.length}
- Produtos com margem NEGATIVA: ${negativeMargin.length}
- Produtos com margem muito baixa (<10%): ${lowMarginProducts.length}

### CURVA ABC (por valor em estoque)
- Curva A (80% do valor): ${curveA.length} produtos
- Curva B (15% do valor): ${curveB.length} produtos
- Curva C (5% do valor): ${curveC.length} produtos

### FINANCEIRO
- Saldo bancário total: R$ ${totalBankBalance.toFixed(2)}
- Contas a pagar vencidas: ${overduePayables.length}
- Contas a receber vencidas: ${overdueReceivables.length}

### VENDAS (últimos 30 dias)
- Total de vendas: ${recentSales.length}
- Valor total: R$ ${recentSales.reduce((s, v) => s + Number(v.total_value || 0), 0).toFixed(2)}

Responda APENAS com um JSON array de insights, sem markdown:
```

---

## 3. Suggest NCM

**Arquivo:** `supabase/functions/suggest-ncm/index.ts`

**Modelo:** `gpt-4.1-mini-2025-04-14`

**System Prompt:**
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

**User Prompt:**
```
Produto: ${productDescription}
Categoria: ${productCategory}
```

---

## 4. Validate NCM

**Arquivo:** `supabase/functions/validate-ncm/index.ts`

**Modelo:** `gpt-4.1-mini-2025-04-14`

**Prompt:**
```
Você é um especialista em classificação fiscal NCM (Nomenclatura Comum do Mercosul) brasileira.

Analise o código NCM: ${cleanNCM}
${productDescription ? `Descrição do produto: ${productDescription}` : ''}

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

---

## 5. Purchase Suggestion (Sugestão de Compra)

**Arquivo:** `supabase/functions/purchase-suggestion/index.ts`

**Tipo:** Rule-based (sem LLM)

**Algoritmo:**
```typescript
// Determinar prioridade baseado em regras
if (currentStock <= 0) {
  priority = 'critical';
  reasoning = 'Estoque zerado - ruptura imediata';
} else if (currentStock < minStock) {
  priority = 'critical';
  reasoning = `Estoque abaixo do mínimo (${currentStock} < ${minStock})`;
} else if (daysUntilStockout <= 7) {
  priority = 'high';
  reasoning = `Ruptura prevista em ${daysUntilStockout} dias`;
} else if (daysUntilStockout <= 14) {
  priority = 'medium';
  reasoning = `Ruptura prevista em ${daysUntilStockout} dias`;
} else if (currentStock < minStock * 1.5) {
  priority = 'low';
  reasoning = 'Estoque próximo ao ponto de reposição';
}

// Calcular quantidade sugerida
const demandForecast = avgDailySales * forecast_days;
const suggestedQuantity = Math.max(
  Math.ceil(maxStock - currentStock),
  Math.ceil(demandForecast - currentStock),
  minStock
);
```

**Parâmetros de entrada:**
- `company_id` - ID da empresa
- `forecast_days` - Dias para previsão (default: 30)
- `include_low_priority` - Incluir baixa prioridade (default: true)

**IMPORTANTE:** Sempre retorna `requires_human_approval: true` - nunca cria pedidos automaticamente.

---

## 6. Monitor Stock Levels

**Arquivo:** `supabase/functions/monitor-stock-levels/index.ts`

**Tipo:** Rule-based (sem LLM)

**Regras implementadas:**

1. **Estoque Negativo**
```typescript
const negativeStock = products.filter(p => (p.current_stock || 0) < 0);
// type: "critical", priority: 10
```

2. **Estoque Abaixo do Mínimo**
```typescript
const lowStock = products.filter(p => 
  p.min_stock && (p.current_stock || 0) <= p.min_stock && (p.current_stock || 0) >= 0
);
// type: "warning", priority: 7
// Calcula valor estimado para reposição
```

3. **Estoque Acima do Máximo (Capital Parado)**
```typescript
const overStock = products.filter(p => 
  p.max_stock && (p.current_stock || 0) > p.max_stock
);
// type: "info", priority: 4
// Calcula capital parado
```

4. **Produtos Sem Giro (90 dias)**
```typescript
const stagnantProducts = products.filter(p => 
  !productsWithMovement.has(p.id) && (p.current_stock || 0) > 0
);
// type: "warning", priority: 5
// Calcula valor empatado
```

---

## 7. Monitor Financial Health

**Arquivo:** `supabase/functions/monitor-financial-health/index.ts`

**Tipo:** Rule-based (sem LLM)

**Regras implementadas:**

1. **Contas a Pagar Atrasadas**
```typescript
// Contas vencidas (due_date <= hoje e is_paid = false)
// type: "critical", priority: 10
```

2. **Vencimentos Próximos (7 dias)**
```typescript
// type: "warning", priority: 5
```

3. **Recebíveis em Atraso**
```typescript
// type: "warning", priority: 7
```

4. **Risco de Caixa Negativo**
```typescript
const cashFlowBalance = incomingCash - outgoingCash;
if (cashFlowBalance < 0) {
  // type: "critical", priority: 9
}
```

5. **Conciliação Pendente**
```typescript
if (unreconciledTx.length > 10) {
  // type: "info", priority: 3
}
```

6. **Boletos DDA Vencendo (3 dias)**
```typescript
// type: "warning", priority: 6
```

---

## 8. CFO Cost Monitoring

**Arquivo:** `supabase/functions/cfo-cost-monitoring/index.ts`

**Tipo:** Rule-based (sem LLM)

**Threshold:** 20% de aumento considerado significativo

**Regras:**

1. **Comparação de Gastos Período a Período**
```typescript
const variation = previousTotal > 0 
  ? ((currentTotal - previousTotal) / previousTotal) * 100 
  : 0;

if (variation > COST_INCREASE_THRESHOLD) {
  // severity: variation > 50 ? 'critical' : 'warning'
}
```

2. **Análise por Categoria (Plano de Contas)**
```typescript
// Verifica categorias com aumento > 20% E valor > R$ 1.000
```

3. **Top Fornecedores por Volume**
```typescript
// Informativos sobre os 3 maiores fornecedores
```

---

## 9. CFO Efficiency Analysis

**Arquivo:** `supabase/functions/cfo-efficiency-analysis/index.ts`

**Tipo:** Rule-based (sem LLM)

**Análises:**

1. **Tempo Médio de Conclusão de OS**
```typescript
// Alerta se aumento > 20% e tempo médio > 24h
const timeIncrease = historicalAvg > 0 
  ? ((avgCompletionTime - historicalAvg) / historicalAvg) * 100 
  : 0;
```

2. **Ticket Médio de OS**
```typescript
// Alerta se queda > 15%
const ticketDecrease = historicalAvgRevenue > 0 
  ? ((historicalAvgRevenue - avgRevenuePerOS) / historicalAvgRevenue) * 100 
  : 0;
```

3. **Taxa de Conversão de Orçamentos**
```typescript
// Alerta se taxa < 30% e total > 10
if (conversionRate < 30 && (totalQuotations + convertedSales) > 10)
```

4. **Produtos Parados no Estoque (90 dias)**
```typescript
// Alerta se valor > R$ 5.000
```

---

## 10. CFO Profitability Check

**Arquivo:** `supabase/functions/cfo-profitability-check/index.ts`

**Tipo:** Rule-based (sem LLM)

**Threshold:** 15% margem mínima aceitável

**Análise em tempo real (última hora):**

1. **Vendas Concluídas**
```typescript
const margin = totalRevenue > 0 
  ? ((totalRevenue - totalCost) / totalRevenue) * 100 
  : 0;

if (margin < MIN_MARGIN_THRESHOLD) {
  // severity: margin < 5 ? 'critical' : 'warning'
}
```

2. **OS Concluídas**
```typescript
// Mesma lógica
// Para serviços: assume 80% de margem (custo = 20% do valor)
```

---

## 11. Demand Analysis (Análise de Demanda)

**Arquivo:** `supabase/functions/demand-analysis/index.ts`

**Tipo:** Rule-based (sem LLM)

**Objetivo:** Identificar vendas/OS aprovadas sem estoque disponível

**Algoritmo:**
```typescript
// 1. Buscar status de OS/Vendas com stock_behavior = 'reserve'
// 2. Somar demanda total por produto
// 3. Comparar com estoque atual
// 4. Calcular falta (stock_shortage)

const stockShortage = Math.max(0, totalDemand - currentStock);

// 5. Buscar último fornecedor e preço de cada produto
// 6. Ordenar por data (mais antigas = maior prioridade)
```

**Retorno:**
```typescript
{
  demands: [...],        // Lista detalhada por OS/Venda
  product_summary: [...], // Resumo por produto
  summary: {
    total_demands,
    os_count,
    sale_count,
    unique_products,
    estimated_purchase_value
  }
}
```

---

## 12. Analyze Margin Impact

**Arquivo:** `supabase/functions/analyze-margin-impact/index.ts`

**Tipo:** Rule-based (sem LLM)

**Threshold:** 20% margem mínima

**Objetivo:** Alertar quando novo custo de compra impacta vendas/OS pendentes

**Algoritmo:**
```typescript
// Para cada item do pedido de compra:
// 1. Buscar vendas "Aguardando Peças" com o produto
// 2. Buscar OS com o produto
// 3. Calcular margem antiga e nova

const oldMargin = salePrice > 0 ? ((salePrice - oldCost) / salePrice) * 100 : 0;
const newMargin = salePrice > 0 ? ((salePrice - newCost) / salePrice) * 100 : 0;

// 4. Se margem nova < threshold e antiga >= threshold, alertar
if (newMargin < MIN_MARGIN_THRESHOLD && oldMargin >= MIN_MARGIN_THRESHOLD) {
  const potentialLoss = (newCost - oldCost) * quantity;
  // Criar alerta
}
```

---

## 13. Reconciliation Engine (Conciliação Bancária)

**Arquivo:** `supabase/functions/reconciliation-engine/index.ts`

**Tipo:** Rule-based (sem LLM)

### Extração de Nome do Extrato
```typescript
function extractNameFromDescription(description: string | null): string | null {
  // Padrão 1: PIX ENVIADO/RECEBIDO - Cp: XXX-Nome
  const pixPattern1 = /PIX\s+(?:ENVIADO|RECEBIDO)\s*-\s*(?:Cp\s*:?\s*)?[\d\-]*-?\s*(.+)/i;
  
  // Padrão 2: PIX ENVIADO DE/PARA Nome
  const pixPattern2 = /PIX\s+(?:ENVIADO|RECEBIDO)\s+(?:DE\s+|PARA\s+)?(.+)/i;
  
  // Padrão 3: TED XXX Nome
  const tedPattern = /TED\s+[\d\s]+(.+)/i;
  
  // Padrão 4: TRANSFERENCIA Nome
  const transPattern = /TRANSF(?:ERENCIA)?\s+(?:PIX\s+)?(?:DE\s+|PARA\s+)?(.+)/i;
  
  // Padrão 5: PAG*Nome
  const pagPattern = /PAG\*(.+)/i;
}
```

### Cálculo de Similaridade
```typescript
function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  if (norm1 === norm2) return 1;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.95;
  
  // Comparação de palavras
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  let matchingWords = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || 
          (word1.length >= 4 && word2.length >= 4 && 
           (word1.includes(word2) || word2.includes(word1)))) {
        matchingWords++;
        break;
      }
    }
  }
  
  return matchingWords / Math.max(words1.length, words2.length);
}
```

### Estratégias de Match (em ordem de prioridade)

1. **Nosso Número (99% confidence)**
```typescript
if (nossoNum && searchIn.includes(nossoNum)) {
  // confidence_score: 99
  // match_type: 'nosso_numero'
}
```

2. **Nome Extraído + Valor Exato**
```typescript
if (entityMatch && entityMatch.similarity >= 0.5) {
  // Prioriza títulos VENCIDOS ou próximos do vencimento
  // confidence: 85-98 (baseado em similaridade)
  // match_type: 'exact_1_1'
  
  // Penalidade para vencimento futuro:
  // -2 pontos por dia no futuro
}
```

3. **Aglutinação 1:N (vários títulos)**
```typescript
function findAggregations(targetAmount, entries, maxEntries = 10, tolerance = 0.01) {
  // Backtracking para encontrar combinações que somam o valor
  // confidence: 75-92 (baseado em similaridade do nome)
  // match_type: 'aggregation_1_n'
}
```

4. **Valor Exato (sem nome identificado)**
```typescript
if (valueDiff < 0.01) {
  // confidence_score: 60
  // match_type: 'value_only'
  // requires_review: true
}
```

5. **Regras de Extrato**
```typescript
if (normalizedDesc.includes(normalizedSearch)) {
  // confidence_score: 95
  // match_type: 'rule'
}
```

---

## 14. Find Product Matches

**Arquivo:** `supabase/functions/find-product-matches/index.ts`

**Tipo:** String matching (sem LLM)

### Normalização de Código
```typescript
function normalizeCode(code: string): string {
  return code
    .replace(/[^a-zA-Z0-9]/g, '') // Remove caracteres especiais
    .replace(/^0+/, '')            // Remove zeros à esquerda
    .toUpperCase();
}
```

### Similaridade de Levenshtein
```typescript
function levenshteinSimilarity(str1: string, str2: string): number {
  // Algoritmo de distância de Levenshtein
  // Retorna 0-100 (porcentagem de similaridade)
}
```

### Extração de Keywords
```typescript
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'para', 'por', 'com', 'sem', 'a', 'o',
    'e', 'ou', 'que', 'se', 'ao', 'aos', 'as', 'os', 'p', 'c'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõöúçñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
```

### Estratégias de Match

1. **Código Exato** - Score: 100
2. **Código Normalizado** - Score: 95
3. **Código Parcial** - Score: 85
4. **Similaridade de Descrição** - Score: até 90

---

## Resumo de Modelos Utilizados

| Função | Modelo | Tipo |
|--------|--------|------|
| financial-ai | gpt-4.1-mini-2025-04-14 | LLM + Streaming |
| analyze-and-generate-insights | gpt-4.1-mini-2025-04-14 | LLM |
| suggest-ncm | gpt-4.1-mini-2025-04-14 | LLM |
| validate-ncm | gpt-4.1-mini-2025-04-14 | LLM |
| purchase-suggestion | - | Rule-based |
| monitor-stock-levels | - | Rule-based |
| monitor-financial-health | - | Rule-based |
| cfo-cost-monitoring | - | Rule-based |
| cfo-efficiency-analysis | - | Rule-based |
| cfo-profitability-check | - | Rule-based |
| demand-analysis | - | Rule-based |
| analyze-margin-impact | - | Rule-based |
| reconciliation-engine | - | Rule-based (algoritmos de matching) |
| find-product-matches | - | String matching (Levenshtein) |

---

## Configurações e Thresholds

| Parâmetro | Valor | Localização |
|-----------|-------|-------------|
| Margem mínima | 15-20% | cfo-profitability-check, analyze-margin-impact |
| Aumento de custo significativo | 20% | cfo-cost-monitoring |
| Dias para ruptura (crítico) | 7 | purchase-suggestion |
| Dias para ruptura (alto) | 14 | purchase-suggestion |
| Produtos sem giro | 90 dias | monitor-stock-levels, cfo-efficiency-analysis |
| Taxa de conversão mínima | 30% | cfo-efficiency-analysis |
| Similaridade mínima (nome) | 50% | reconciliation-engine |
