# Relatório de Revisão Completa - Flow Layout Hub

**Data:** 31/12/2024  
**Versão:** 1.0

---

## 📋 RESUMO EXECUTIVO

Este relatório documenta a revisão completa do sistema Flow Layout Hub, identificando falhas de código, problemas em listas suspensas (selects), melhorias necessárias nos prompts das IAs, e correções pendentes no fluxo de importação XML e financeiro.

---

## 🚨 PROBLEMAS CRÍTICOS (Prioridade Alta)

### 1. Cadastro de Transportadora no CT-e

**Arquivo:** `src/pages/compras/ImportarXML.tsx` e `src/components/compras/CadastrarFornecedorDialog.tsx`

**Problemas identificados:**
1. O diálogo de cadastro de transportadora usa dados da NF-e (`nfeData?.transportador`) ao invés dos dados do CT-e (`cteData.emit`)
2. O callback `onSuccess` não recebe o ID da transportadora cadastrada
3. A transportadora é cadastrada com `is_fornecedor: false`, impedindo que apareça no contas a pagar
4. Falta `company_id` no cadastro

**Correção necessária:**

```tsx
// Em ImportarXML.tsx - Alterar o CadastrarFornecedorDialog de transportadora:
<CadastrarFornecedorDialog
  open={dialogTransportador}
  onOpenChange={setDialogTransportador}
  dados={cteData ? {
    cnpj: cteData.emit.cnpj,
    razaoSocial: cteData.emit.razaoSocial,
    inscricaoEstadual: cteData.emit.inscricaoEstadual,
    endereco: cteData.emit.endereco,
    cidade: cteData.emit.cidade,
    uf: cteData.emit.uf,
    modalidadeFrete: ""
  } : nfeData?.transportador || null}
  tipo="transportador"
  onSuccess={(pessoaId) => {
    setTransportadorCadastrado(true);
    if (pessoaId) setTransportadorId(pessoaId);
  }}
/>

// Em CadastrarFornecedorDialog.tsx - Adicionar company_id e is_fornecedor:
const { data: pessoaData, error: pessoaError } = await supabase
  .from("pessoas")
  .insert({
    company_id: currentCompany?.id, // ADICIONAR
    razao_social: dados.razaoSocial,
    cpf_cnpj: dados.cnpj,
    inscricao_estadual: dados.inscricaoEstadual,
    endereco: dados.endereco,
    cidade: dados.cidade,
    uf: dados.uf,
    is_transportador: true,
    is_fornecedor: true, // MUDAR de false para true
    is_active: true,
  })
  .select("id")
  .single();

// Chamar onSuccess com o ID:
onSuccess?.(pessoaData?.id);
```

---

### 2. Frete do Pedido de Compras não vai para Contas a Pagar

**Arquivo:** `src/components/pedidos-compra/PurchaseOrderForm.tsx`

**Problema:** Quando um pedido de compras é salvo com CT-e importado, o frete não gera automaticamente uma conta a pagar para a transportadora.

**Correção necessária:** Adicionar na função `handleSave`, após o loop de atualização de custos:

```typescript
// Criar payable do frete se houver CT-e importado com transportadora
const cteFreightValue = order?.cte_freight_value || 0;
const cteCarrierId = order?.cte_carrier_id;
const cteNumber = order?.cte_number;
const cteDate = order?.cte_date;

if (cteFreightValue > 0 && cteCarrierId && purpose !== "garantia") {
  // Verificar se já existe payable de frete para este pedido
  const { data: existingFreightPayable } = await supabase
    .from("payables")
    .select("id")
    .eq("purchase_order_id", orderId)
    .eq("document_type", "cte_frete")
    .maybeSingle();
  
  if (!existingFreightPayable) {
    // Criar novo payable para o frete
    await supabase.from("payables").insert({
      company_id: COMPANY_ID,
      supplier_id: cteCarrierId,
      purchase_order_id: orderId,
      amount: cteFreightValue,
      due_date: cteDate || firstDueDate,
      document_type: "cte_frete",
      document_number: cteNumber || undefined,
      description: `Frete CT-e #${cteNumber || 'N/A'} - Pedido #${order?.order_number || 'Novo'}`,
      chart_account_id: chartAccountId || undefined,
      cost_center_id: costCenterId || undefined,
      is_forecast: true,
    });
  }
}
```

---

## ⚠️ PROBLEMAS DE USABILIDADE (Prioridade Média)

### 3. Listas Suspensas (Selects) sem Campo de Busca

**Arquivos afetados:**
- `src/components/financeiro/PayableForm.tsx` - Select de fornecedor
- `src/components/pedidos-compra/PurchaseOrderForm.tsx` - Select de fornecedor
- Vários outros formulários

**Problema:** Os selects de fornecedor, cliente, produto, etc. não possuem campo de busca, dificultando a seleção quando há muitos registros.

**Solução recomendada:** Substituir os `<Select>` simples por Combobox com busca usando os componentes `Command` já existentes no projeto (`src/components/ui/command.tsx`).

**Exemplo de implementação (já existe no CFOPSelect.tsx):**

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Substituir:
<Select value={formData.supplierId} onValueChange={...}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o fornecedor" />
  </SelectTrigger>
  <SelectContent>
    {suppliers.map((s) => (
      <SelectItem key={s.id} value={s.id}>
        {s.nome_fantasia || s.razao_social}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Por:
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {selectedSupplier?.nome_fantasia || selectedSupplier?.razao_social || "Selecione o fornecedor"}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0">
    <Command shouldFilter={false}>
      <CommandInput 
        placeholder="Buscar fornecedor..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
        <CommandGroup>
          {filteredSuppliers.map((s) => (
            <CommandItem
              key={s.id}
              value={s.id}
              onSelect={() => {
                setFormData({ ...formData, supplierId: s.id });
                setOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", formData.supplierId === s.id ? "opacity-100" : "opacity-0")} />
              {s.nome_fantasia || s.razao_social} - {s.cpf_cnpj}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Componentes que precisam dessa melhoria:**
1. `PayableForm.tsx` - Select de fornecedor
2. `PurchaseOrderForm.tsx` - Select de fornecedor
3. `SaleForm.tsx` - Select de cliente
4. `MovimentacoesList.tsx` - Filtro de produto
5. Todos os formulários com selects de entidades

---

## 🤖 MELHORIAS NOS PROMPTS DAS IAs (Prioridade Média)

### 4. Prompt do CFO Bot / Financial AI

**Arquivo:** `supabase/functions/financial-ai/index.ts`

**Problemas:**
1. O prompt é muito genérico e não dá instruções específicas sobre como analisar os dados
2. Falta contexto sobre o negócio da empresa
3. Não há instruções sobre formatação de valores monetários

**Prompt atual (linha 174-227):**
```typescript
const systemPrompt = `Você é um assistente de inteligência artificial com ACESSO COMPLETO a todos os dados do sistema ERP...`
```

**Prompt melhorado sugerido:**

```typescript
const systemPrompt = `Você é o CFO Virtual da empresa, um assistente financeiro especializado com ACESSO COMPLETO a todos os dados do sistema ERP.

## PERSONALIDADE E TOM
- Seja direto, objetivo e profissional
- Use linguagem de negócios, mas acessível
- Sempre baseie suas análises em dados concretos
- Priorize insights acionáveis sobre descrições genéricas

## MÓDULOS E DADOS DISPONÍVEIS
1. **Financeiro**: Contas a pagar/receber, transações bancárias, fluxo de caixa, DRE
2. **Compras**: Pedidos, fornecedores, custos, fretes
3. **Vendas**: Faturamento, clientes, margens, comissões
4. **Estoque**: Produtos, giro, curva ABC, custos médios
5. **Fiscal**: NF-e, CT-e, impostos

## CAPACIDADES ESPECIAIS
1. **Detecção de Anomalias**: Identificar pagamentos duplicados, valores fora do padrão, concentração de fornecedores
2. **Projeção de Fluxo de Caixa**: Calcular saldo projetado considerando contas a pagar/receber
3. **Análise de Margens**: Identificar produtos com margem negativa ou muito baixa
4. **Alertas de Risco**: Vencimentos próximos, inadimplência, estoque crítico

## FORMATAÇÃO
- Valores monetários: R$ X.XXX,XX (sempre com 2 casas decimais)
- Percentuais: XX,X% (1 casa decimal)
- Datas: DD/MM/YYYY
- Use emojis para destacar: 🚨 crítico, ⚠️ atenção, ✅ ok, 💡 sugestão, 📊 dados

## REGRAS DE RESPOSTA
- Sempre cite números específicos dos dados fornecidos
- Priorize problemas CRÍTICOS primeiro
- Sugira ações concretas e práticas
- Se não houver dados suficientes, informe claramente

${fullContext}`;
```

---

### 5. Prompt de Geração de Insights

**Arquivo:** `supabase/functions/analyze-and-generate-insights/index.ts`

**Problemas:**
1. O prompt pede JSON mas não especifica bem o formato
2. Não há validação robusta do JSON retornado
3. Os insights gerados são muito genéricos

**Prompt melhorado sugerido (linha 335-356):**

```typescript
const aiPrompt = `Você é um analista de negócios especializado em ERP. Analise os dados abaixo e gere insights ACIONÁVEIS.

## FORMATO DE SAÍDA
Responda APENAS com um JSON array válido. Cada objeto deve ter EXATAMENTE estes campos:
{
  "type": "critical" | "warning" | "info" | "success",
  "category": "${category || 'stock | financial | sales | purchases'}",
  "mode": "auditora" | "cfo_bot" | "especialista",
  "title": "Título curto e impactante (máx 40 chars)",
  "message": "Descrição com NÚMEROS CONCRETOS (máx 150 chars)",
  "action_label": "Texto do botão (máx 15 chars)",
  "action_url": "/ajustes | /solicitacoes | /contas-pagar | /contas-receber | /saldo-estoque | /vendas | /produtos",
  "priority": 1-10
}

## REGRAS CRÍTICAS
1. SEMPRE inclua números reais dos dados (valores, quantidades, percentuais)
2. Priorize problemas que impactam DINHEIRO primeiro
3. Cada insight deve ter uma AÇÃO clara
4. Não repita insights similares
5. Se não houver problemas, gere insights de OPORTUNIDADE

## EXEMPLOS BOM vs RUIM
❌ RUIM: "Produtos com estoque baixo" (genérico)
✅ BOM: "5 produtos abaixo do mínimo - R$ 12.500 em risco de ruptura"

❌ RUIM: "Contas vencidas precisam de atenção" (vago)
✅ BOM: "R$ 8.750 em 3 contas vencidas há mais de 15 dias"

## DADOS PARA ANÁLISE
${contextSummary}

Gere de 3 a 5 insights. Responda APENAS com o JSON array:`;
```

---

### 6. Prompt de Auditoria de Pedidos

**Arquivo:** `src/components/pedidos-compra/PurchaseOrderAIAudit.tsx`

**Problema:** O prompt de auditoria (linha 456-465) é muito simples e não aproveita todo o contexto disponível.

**Prompt melhorado sugerido:**

```typescript
const auditPrompt = `Você é um auditor financeiro especializado em compras. Analise este pedido e dê uma recomendação OBJETIVA.

## CONTEXTO DO PEDIDO
- Valor: R$ ${totalValue.toFixed(2)}
- Finalidade: ${purpose}
- Itens: ${items.length}
- Fornecedor: ${supplierHistory ? `${supplierHistory.total_orders} pedidos anteriores, média R$ ${supplierHistory.avg_order_value.toFixed(2)}` : 'Primeiro pedido'}

## ALERTAS DETECTADOS
${alertsSummary}

## ANÁLISE DE RISCO
${cashFlowImpact ? `
- Saldo atual: R$ ${cashFlowImpact.current_balance.toFixed(2)}
- Saldo após pedido: R$ ${cashFlowImpact.after_order_balance.toFixed(2)}
- Nível de risco: ${cashFlowImpact.risk_level}
` : 'Não disponível'}

## SUA TAREFA
1. Avalie se o pedido deve ser APROVADO, APROVADO COM RESSALVAS ou REJEITADO
2. Justifique em 2-3 frases curtas
3. Se houver ressalvas, indique a ação necessária

Responda de forma direta e prática.`;
```

---

## 📝 TODOs E CÓDIGO INCOMPLETO

### 7. TODOs Pendentes no Código

| Arquivo | Linha | TODO |
|---------|-------|------|
| `LancamentosPayablesList.tsx` | 471 | Implementar pagamento de boleto via Inter API |
| `useCheckout.ts` | 520 | Pegar user_name do contexto de auth |
| `useClientes.ts` | 198 | Pegar usuario_id do usuário logado |
| `ImportarXML.tsx` | 453 | Pegar UF da empresa do contexto |
| `NotasCompra.tsx` | 171 | Implementar comportamento financeiro |
| `PedidosCompra.tsx` | 354 | Implementar geração de PDF |
| `Vendas.tsx` | 20 | Abrir visualização |
| `OrdensServico.tsx` | 20 | Abrir visualização |

---

## 🔧 MELHORIAS TÉCNICAS

### 8. Uso Excessivo de `as any`

**Problema:** 61 ocorrências de `as any` no código, indicando problemas de tipagem.

**Arquivos mais afetados:**
- Hooks de dados (usePessoas, useProducts, etc.)
- Componentes de formulário
- Edge functions

**Recomendação:** Criar tipos adequados para todas as entidades do Supabase e remover os `as any`.

---

### 9. COMPANY_ID Hardcoded

**Problema:** Vários arquivos usam COMPANY_ID hardcoded ao invés de pegar do contexto.

**Arquivos afetados:**
- `FinancialAIChat.tsx` (linha 22)
- `PurchaseOrderAIAudit.tsx` (linha 88)
- Outros componentes

**Correção:** Usar `useCompany()` hook em todos os lugares.

---

## ✅ CHECKLIST DE CORREÇÕES

### Prioridade Alta (Fazer Agora)
- [ ] Corrigir cadastro de transportadora no CT-e
- [ ] Adicionar company_id no cadastro de transportadora
- [ ] Mudar is_fornecedor para true na transportadora
- [ ] Implementar criação de payable do frete no PurchaseOrderForm

### Prioridade Média (Próxima Sprint)
- [ ] Substituir Selects por Combobox com busca
- [ ] Melhorar prompts das IAs
- [ ] Resolver TODOs pendentes
- [ ] Remover COMPANY_ID hardcoded

### Prioridade Baixa (Backlog)
- [ ] Remover `as any` e criar tipos adequados
- [ ] Implementar pagamento de boleto via Inter API
- [ ] Implementar geração de PDF de pedidos

---

## 📎 ARQUIVOS MODIFICADOS NESTA REVISÃO

1. `src/components/compras/CadastrarFornecedorDialog.tsx` - Adicionar company_id e is_fornecedor
2. `src/pages/compras/ImportarXML.tsx` - Usar dados do CT-e para transportadora
3. `src/hooks/usePayablesGeneration.ts` - Usar emit do CT-e para recipient
4. `src/components/pedidos-compra/PurchaseOrderForm.tsx` - Criar payable do frete

---

**Fim do Relatório**
