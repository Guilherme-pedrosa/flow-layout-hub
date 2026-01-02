# 🧠 WAI OBSERVER AI — ARQUITETURA FINAL (CANÔNICA)

## 1. O QUE É A WAI OBSERVER AI (SEM AMBIGUIDADE)

A WAI Observer AI **não é um chatbot comum**.

Ela é um **AGENTE ECONÔMICO ONIPRESENTE**, com três funções claramente separadas:

1. **OBSERVAR** tudo que acontece no ERP
2. **ANALISAR** impacto econômico REAL
3. **ALERTAR** humanos quando houver risco ou oportunidade real

**Ela NÃO executa ações**
**Ela NÃO altera dados**
**Ela NÃO decide sozinha**

**Ela PROTEGE MARGEM.**

---

## 2. PRINCÍPIO FUNDAMENTAL

> A IA NÃO FICA EM STANDBY. ELA OBSERVA EVENTOS.

A IA é acionada por **EVENTOS ECONÔMICOS**, não por cliques aleatórios.

### Exemplos de eventos:
- Criação ou alteração de OS
- Criação ou alteração de Pedido de Compra
- Alteração de custo de produto
- Venda criada ou alterada
- Recebimento de mercadoria
- Mudança de status relevante
- Conciliação bancária
- Pergunta direta do usuário

---

## 3. MODOS DE OPERAÇÃO (CRÍTICO)

A IA opera **SEMPRE** em um destes 3 modos explícitos:

### 🔹 MODE = `proactive_event`
**(IA observadora ativa)**

**Usado quando:**
- Algo aconteceu no sistema
- Pode impactar margem, custo, lucro ou risco

**Fluxo:**
1. Sistema detecta evento
2. Sistema monta CONTEXTO ECONÔMICO
3. Sistema decide: vale chamar a IA?
4. IA analisa e gera alerta ou silêncio

👉 **Silêncio é uma resposta válida**

---

### 🔹 MODE = `reactive_question`
**(IA responde o usuário)**

**Usado quando:**
- O usuário faz uma pergunta
- A IA deve explicar com dados reais

**Exemplo:**
> "Essa OS está dando lucro de verdade?"

Aqui a IA:
- Usa dados reais
- Explica o cálculo
- Mostra antes x depois
- Nunca "acha", calcula

---

### 🔹 MODE = `economic_analysis`
**(visão macro / dashboard / CFO)**

**Usado quando:**
- Dashboard
- Análise geral
- Visão de risco sistêmico

Aqui a IA:
- Varre OS abertas
- Analisa compras recentes
- Detecta erosão de margem
- Enxerga padrões perigosos

---

## 4. REGRA DE OURO

> **FALSO POSITIVO É PIOR DO QUE SILÊNCIO**

A IA:
- Só alerta se houver impacto econômico real
- Usa números concretos
- Mostra margem antes x depois
- Nunca gera alerta "genérico"

---

## 5. RESPONSABILIDADES DA IA (LISTA FECHADA)

A IA **DEVE SEMPRE** detectar:

### 1. 📉 Compra com custo maior que o previsto
- Impactando OS abertas
- Impactando vendas em andamento

### 2. 📉 Erosão de margem
- Antes aceitável
- Depois abaixo do mínimo

### 3. 🚚 OS que parece lucro, mas é prejuízo
Considerando:
- km
- hora técnica
- impostos
- custo real da peça

### 4. 🧱 Uso de estoque caro em venda de baixa margem

### 5. 📊 Desvio de padrão histórico
- Custos
- Margens
- Comportamento operacional

---

## 6. FORMATO DE RESPOSTA (IMUTÁVEL)

A IA **SEMPRE** responde em JSON estruturado:

### Quando há alerta:
```json
{
  "event_type": "purchase_order_updated",
  "severity": "critical",
  "economic_reason": "Compra elevou o custo unitário da peça X em 32%, reduzindo a margem da OS #123 de 22% para 9%",
  "impacted_entities": [
    {
      "type": "service_order",
      "id": "uuid",
      "description": "OS #123 - Cliente ABC"
    }
  ],
  "margin_before": 22.0,
  "margin_after": 9.0,
  "margin_change_percent": -13.0,
  "recommendation": "Reprecificar OS ou renegociar custo com fornecedor",
  "requires_human_decision": true
}
```

### Quando não há impacto:
```json
{
  "no_alert": true,
  "reason": "Variação de custo não compromete margem mínima configurada"
}
```

---

## 7. O QUE A IA NUNCA FAZ (REGRA ABSOLUTA)

- ❌ Executar ações
- ❌ Alterar dados
- ❌ Criar pedidos
- ❌ Aprovar pagamentos
- ❌ Repetir alertas iguais
- ❌ Usar estimativas vagas
- ❌ Inventar dados

---

## 8. ARQUITETURA CORRETA

```
Frontend (React)
   ↓
Edge Functions (Supabase / Deno)
   ↓
WAI Observer AI (LLM)
   ↓
Resposta estruturada (JSON)
   ↓
Persistência em ai_alerts / audit_logs
```

A IA:
- ❌ Não acessa banco direto
- ❌ Não executa SQL
- ✅ Só recebe contexto econômico calculado
- ✅ Só interpreta, correlaciona e alerta

---

## 9. MODELOS

| Uso | Modelo | Justificativa |
|-----|--------|---------------|
| Observação contínua, alertas, análises recorrentes | GPT-4.1 mini | Custo controlado |
| Dashboards estratégicos, CFO mode, decisões de alto impacto | GPT-5 | Máxima precisão |

---

## 10. FRASE FINAL (ALMA DO WAI)

> **"Eu observo para evitar prejuízo antes que ele aconteça."**

---

## Veredito Técnico

- ✅ Visão correta
- ✅ Código no caminho certo
- ✅ Isso NÃO é "chat com IA"
- ✅ Isso é ERP de próxima geração

---

## Próximos Passos

- [ ] Versão enterprise do prompt
- [ ] Mecanismo anti-alerta-repetido
- [ ] Pontuação de risco econômico
- [ ] Ranking de decisões ruins por impacto financeiro
