# ALTERAÇÕES PARA O LOVABLE - VERSÃO FINAL

## RESUMO DAS ALTERAÇÕES JÁ FEITAS

### 1. COMPONENTE SearchableSelect (NOVO)
**Arquivo:** `src/components/shared/SearchableSelect.tsx`

Componente reutilizável de select com campo de busca integrado. Usa o Command/Combobox do shadcn.

**Props:**
- `options`: Array de { value, label, sublabel? }
- `value`: Valor selecionado
- `onChange`: Callback quando muda
- `placeholder`: Texto do placeholder
- `searchPlaceholder`: Texto do campo de busca
- `emptyMessage`: Mensagem quando não encontra
- `onCreateNew`: Callback para cadastrar novo
- `createNewLabel`: Texto do botão de cadastrar
- `disabled`: Desabilitar o select
- `className`: Classes CSS adicionais

---

### 2. DIÁLOGO DE CONFIRMAÇÃO AO TROCAR EMPRESA
**Arquivo:** `src/components/layout/CompanySelector.tsx`

Adicionado AlertDialog que pergunta "Tem certeza que deseja trocar de empresa?" antes de efetivar a troca.

---

### 3. SELECTS SUBSTITUÍDOS PELO SearchableSelect

| Arquivo | Campo | Status |
|---------|-------|--------|
| `PayableForm.tsx` | Fornecedor | ✅ Feito |
| `PurchaseOrderForm.tsx` | Fornecedor | ✅ Feito |
| `SaleFormDadosGerais.tsx` | Cliente | ✅ Feito |
| `ServiceOrderFormDadosGerais.tsx` | Cliente | ✅ Feito |
| `PayablesFilters.tsx` | Fornecedor | ✅ Feito |

---

### 4. CORREÇÕES ANTERIORES (JÁ APLICADAS)

| Arquivo | Correção |
|---------|----------|
| `CadastrarFornecedorDialog.tsx` | Adicionado `company_id` e `is_fornecedor: true` |
| `ImportarXML.tsx` | Usar dados do CT-e para transportadora |
| `usePayablesGeneration.ts` | Usar `emit` do CT-e (transportadora) |
| `PurchaseOrderForm.tsx` | Criar payable do frete automaticamente |

---

## ALTERAÇÕES PENDENTES PARA O LOVABLE

### 5. SUBSTITUIR MAIS SELECTS

Os seguintes arquivos ainda usam Select simples e precisam ser substituídos pelo SearchableSelect:

```
src/components/financeiro/DDABoletosList.tsx - Fornecedor
src/components/financeiro/ReceivablesFilters.tsx - Cliente
src/components/compras/FornecedorCard.tsx - Fornecedor
src/components/compras/TransportadorCard.tsx - Transportadora
src/components/vendas/SmartQuotation.tsx - Cliente
src/components/produtos/ProductFormFornecedores.tsx - Fornecedor
```

**Padrão de substituição:**

```tsx
// DE:
<Select value={value} onValueChange={onChange}>
  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
  <SelectContent>
    {items.map(item => (
      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
    ))}
  </SelectContent>
</Select>

// PARA:
<SearchableSelect
  options={items.map(item => ({
    value: item.id,
    label: item.name,
    sublabel: item.document // opcional
  }))}
  value={value}
  onChange={onChange}
  placeholder="Selecione"
  searchPlaceholder="Buscar..."
  emptyMessage="Nenhum resultado"
/>
```

---

### 6. MELHORIAS NO CADASTRO DE CLIENTES

O cadastro de clientes já tem busca por CEP implementada. Melhorias adicionais:

1. **Asterisco vermelho nos campos obrigatórios** - Adicionar `<span className="text-destructive">*</span>` após o Label
2. **Validação antes de salvar** - Verificar campos obrigatórios e mostrar toast de erro
3. **Tipo de contato** - Adicionar campo "tipo" (Comercial, Financeiro, Técnico) na tabela de contatos

---

### 7. LINKS CLICÁVEIS ENTRE PÁGINAS

Implementar navegação entre páginas relacionadas:

```tsx
// No Dashboard, ao clicar em "A pagar hoje"
<Link to="/financeiro/contas-pagar?vencimento=hoje">
  A pagar hoje: R$ 1.979,13
</Link>

// No Contas a Pagar, ao clicar no fornecedor
<Link to={`/cadastros/fornecedores/${payable.supplier_id}`}>
  {payable.supplier_name}
</Link>

// No Contas a Pagar, ao clicar no pedido
<Link to={`/compras/pedidos/${payable.purchase_order_id}`}>
  Pedido #{payable.purchase_order_number}
</Link>
```

---

## ROADMAP COMPLETO (PRÓXIMAS FASES)

### FASE 1 - FUNDAÇÃO (Atual)
- [x] SearchableSelect em selects principais
- [x] Diálogo de confirmação ao trocar empresa
- [ ] Substituir todos os selects restantes
- [ ] Links clicáveis entre páginas
- [ ] Permissões básicas por módulo

### FASE 2 - CORE
- [ ] Emissão de NF-e (integração com Focus NFe ou Nuvem Fiscal)
- [ ] Módulo de Orçamentos
- [ ] Melhorar módulo de Vendas
- [ ] Melhorar módulo de Estoque
- [ ] IA onipresente (componente global)

### FASE 3 - EXPANSÃO
- [ ] Emissão de NFS-e e NFC-e
- [ ] Contratos recorrentes
- [ ] PDV (ponto de venda)
- [ ] Relatórios avançados
- [ ] Integrações (Mercado Livre, Stone)

### FASE 4 - PROFISSIONALIZAÇÃO
- [ ] 2FA e segurança avançada
- [ ] API pública
- [ ] Aplicativo mobile
- [ ] Módulo de produção
- [ ] Indicadores e BI

---

## STACK TECNOLÓGICA DO GESTÃO CLICK (REFERÊNCIA)

| Camada | Tecnologia |
|--------|------------|
| Frontend | Vue.js 2.x + Bootstrap Vue |
| Gráficos | Highcharts |
| Backend | Provavelmente PHP/Laravel |
| Bundler | Webpack |
| PWA | Service Worker habilitado |
| Suporte | Zendesk |
| NF-e | Emissor próprio (API documentada) |

---

## ARQUIVOS MODIFICADOS NESTA SESSÃO

1. `src/components/shared/SearchableSelect.tsx` - NOVO
2. `src/components/layout/CompanySelector.tsx` - Diálogo de confirmação
3. `src/components/financeiro/PayableForm.tsx` - SearchableSelect
4. `src/components/pedidos-compra/PurchaseOrderForm.tsx` - SearchableSelect
5. `src/components/vendas/SaleFormDadosGerais.tsx` - SearchableSelect
6. `src/components/ordens-servico/ServiceOrderFormDadosGerais.tsx` - SearchableSelect
7. `src/components/financeiro/PayablesFilters.tsx` - SearchableSelect
