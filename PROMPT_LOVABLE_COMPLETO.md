# PROMPT PARA O LOVABLE - ALTERAÇÕES COMPLETAS DO WAI

## 1. COMPONENTE SearchableSelect (JÁ CRIADO)

O componente `src/components/shared/SearchableSelect.tsx` já foi criado com:
- Campo de busca integrado
- Suporte a sublabel (ex: CNPJ abaixo do nome)
- Botão "Cadastrar novo" opcional
- Ícone de check no item selecionado

**Uso:**
```tsx
import { SearchableSelect } from "@/components/shared/SearchableSelect";

<SearchableSelect
  options={fornecedores.map(f => ({
    value: f.id,
    label: f.razao_social,
    sublabel: f.cpf_cnpj
  }))}
  value={supplierId}
  onChange={setSupplierId}
  placeholder="Selecione o fornecedor"
  searchPlaceholder="Buscar fornecedor..."
  emptyMessage="Nenhum fornecedor encontrado"
  onCreateNew={() => setShowCadastroDialog(true)}
  createNewLabel="Cadastrar fornecedor"
/>
```

---

## 2. DIÁLOGO DE CONFIRMAÇÃO AO TROCAR EMPRESA (JÁ CRIADO)

O componente `src/components/layout/CompanySelector.tsx` já foi atualizado com:
- AlertDialog que abre ao clicar em outra empresa
- Mostra nome e CNPJ da empresa de destino
- Botões "Cancelar" e "Sim, trocar empresa"

---

## 3. SUBSTITUIR SELECTS POR SearchableSelect

Substituir os seguintes selects simples pelo SearchableSelect:

### PayableForm.tsx (Fornecedor)
```tsx
// ANTES:
<Select value={supplierId} onValueChange={setSupplierId}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o fornecedor" />
  </SelectTrigger>
  <SelectContent>
    {pessoas.map((p) => (
      <SelectItem key={p.id} value={p.id}>{p.razao_social}</SelectItem>
    ))}
  </SelectContent>
</Select>

// DEPOIS:
<SearchableSelect
  options={pessoas.filter(p => p.is_fornecedor).map(p => ({
    value: p.id,
    label: p.razao_social || p.nome_fantasia || "Sem nome",
    sublabel: p.cpf_cnpj ? formatCpfCnpj(p.cpf_cnpj, p.tipo_pessoa) : undefined
  }))}
  value={supplierId}
  onChange={setSupplierId}
  placeholder="Selecione o fornecedor"
  searchPlaceholder="Buscar por nome ou CNPJ..."
  emptyMessage="Nenhum fornecedor encontrado"
/>
```

### Arquivos para substituir:
1. `src/components/financeiro/PayableForm.tsx` - Campo fornecedor
2. `src/components/financeiro/PayablesFilters.tsx` - Filtro fornecedor
3. `src/components/financeiro/ReceivablesFilters.tsx` - Filtro cliente
4. `src/components/pedidos-compra/PurchaseOrderForm.tsx` - Campo fornecedor
5. `src/components/vendas/SaleFormDadosGerais.tsx` - Campo cliente
6. `src/components/compras/FornecedorCard.tsx` - Campo fornecedor
7. `src/components/compras/TransportadorCard.tsx` - Campo transportadora
8. `src/components/financeiro/DDABoletosList.tsx` - Campo fornecedor
9. `src/components/os/ServiceOrderFormDadosGerais.tsx` - Campo cliente
10. `src/components/cotacao/SmartQuotation.tsx` - Campo cliente

---

## 4. MELHORIAS NO CADASTRO DE CLIENTES

### 4.1 Busca por CEP (ViaCEP)

Adicionar no `ClienteFormEndereco.tsx`:

```tsx
const handleCepSearch = async () => {
  if (!formData.cep || formData.cep.length < 8) return;
  
  setLoadingCep(true);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`);
    const data = await response.json();
    
    if (!data.erro) {
      setFormData({
        ...formData,
        logradouro: data.logradouro || formData.logradouro,
        bairro: data.bairro || formData.bairro,
        cidade: data.localidade || formData.cidade,
        estado: data.uf || formData.estado,
      });
      toast({ title: "CEP encontrado", description: "Endereço preenchido automaticamente." });
    } else {
      toast({ title: "CEP não encontrado", variant: "destructive" });
    }
  } catch {
    toast({ title: "Erro ao buscar CEP", variant: "destructive" });
  } finally {
    setLoadingCep(false);
  }
};
```

### 4.2 Campos Obrigatórios com Asterisco

Adicionar asterisco vermelho nos labels de campos obrigatórios:

```tsx
<Label htmlFor="razao_social">
  {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'}
  <span className="text-destructive ml-1">*</span>
</Label>
```

Campos obrigatórios:
- CPF/CNPJ
- Razão Social / Nome
- E-mail (opcional mas recomendado)

### 4.3 Validação Antes de Salvar

```tsx
const validateForm = () => {
  const errors: string[] = [];
  
  if (!formData.cpf_cnpj) errors.push("CPF/CNPJ é obrigatório");
  if (!formData.razao_social) errors.push("Nome/Razão Social é obrigatório");
  if (formData.tipo_pessoa === 'PJ' && formData.cpf_cnpj?.length !== 14) {
    errors.push("CNPJ deve ter 14 dígitos");
  }
  if (formData.tipo_pessoa === 'PF' && formData.cpf_cnpj?.length !== 11) {
    errors.push("CPF deve ter 11 dígitos");
  }
  
  return errors;
};
```

### 4.4 Tipo de Contato

No `ClienteFormContatos.tsx`, adicionar campo de tipo:

```tsx
<Select value={contato.tipo} onValueChange={(v) => updateContato(index, 'tipo', v)}>
  <SelectTrigger>
    <SelectValue placeholder="Tipo" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="comercial">Comercial</SelectItem>
    <SelectItem value="financeiro">Financeiro</SelectItem>
    <SelectItem value="tecnico">Técnico</SelectItem>
    <SelectItem value="compras">Compras</SelectItem>
    <SelectItem value="diretoria">Diretoria</SelectItem>
    <SelectItem value="outro">Outro</SelectItem>
  </SelectContent>
</Select>
```

---

## 5. SEGREGAÇÃO DE EMPRESAS (MODELO GESTÃO CLICK)

### O que já está correto:
- Todos os hooks filtram por `company_id`
- Dados são segregados por empresa

### O que precisa adicionar (futuro):

#### 5.1 Permissão "Acessar de outras lojas"
Adicionar na tabela `user_companies`:
```sql
ALTER TABLE user_companies ADD COLUMN can_access_other_stores BOOLEAN DEFAULT false;
```

#### 5.2 Vinculação de Cadastros entre Empresas
Criar tabela para vincular cadastros:
```sql
CREATE TABLE shared_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type VARCHAR(50) NOT NULL, -- 'pessoa', 'produto', 'servico'
  record_id UUID NOT NULL,
  company_ids UUID[] NOT NULL, -- empresas que compartilham este registro
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. CORREÇÕES JÁ FEITAS (TRANSPORTADORA/FRETE)

### CadastrarFornecedorDialog.tsx
- Adicionado `company_id: currentCompany?.id`
- Mudado `is_fornecedor: false` para `is_fornecedor: true` na transportadora
- `onSuccess` agora recebe e retorna o `pessoaId`

### ImportarXML.tsx
- Diálogo de transportadora usa `cteData.emit` (dados do CT-e) ao invés de `nfeData.transportador`

### usePayablesGeneration.ts
- Usa `cteData.emit` para dados da transportadora no payable

### PurchaseOrderForm.tsx
- Cria payable do frete automaticamente quando salva pedido com CT-e

---

## RESUMO DE ARQUIVOS ALTERADOS

| Arquivo | Alteração |
|---------|-----------|
| `src/components/shared/SearchableSelect.tsx` | CRIADO - Componente de select com busca |
| `src/components/layout/CompanySelector.tsx` | ALTERADO - Diálogo de confirmação |
| `src/components/compras/CadastrarFornecedorDialog.tsx` | ALTERADO - company_id e is_fornecedor |
| `src/pages/compras/ImportarXML.tsx` | ALTERADO - Usar dados do CT-e |
| `src/hooks/usePayablesGeneration.ts` | ALTERADO - Usar emit do CT-e |
| `src/components/pedidos-compra/PurchaseOrderForm.tsx` | ALTERADO - Criar payable do frete |

---

## PRÓXIMOS PASSOS

1. Substituir os 10 selects críticos pelo SearchableSelect
2. Adicionar busca por CEP no cadastro de clientes
3. Adicionar validação e asteriscos nos campos obrigatórios
4. Adicionar tipo de contato no cadastro de clientes
