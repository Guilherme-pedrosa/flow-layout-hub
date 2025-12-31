# ALTERAÇÕES COMPLETAS DO WAI - PARA LOVABLE

## RESUMO EXECUTIVO

Este documento contém todas as alterações necessárias para:
1. Ajustar a segregação de empresas igual ao Gestão Click
2. Adicionar campo de busca em todas as listas suspensas
3. Melhorar o cadastro de clientes

---

## 1. SEGREGAÇÃO DE EMPRESAS (IGUAL GESTÃO CLICK)

### 1.1 Estado Atual do WAI

| Entidade | Filtro por company_id | Status |
|----------|----------------------|--------|
| Clientes | ✅ Sim | OK |
| Fornecedores | ✅ Sim | OK |
| Produtos | ✅ Sim | OK |
| Serviços | ✅ Sim | OK |
| Pedidos de Compra | ✅ Sim | OK |
| Vendas | ✅ Sim | OK |
| Ordens de Serviço | ✅ Sim | OK |
| Contas a Pagar | ✅ Sim | OK |
| Contas a Receber | ✅ Sim | OK |
| Plano de Contas | ✅ Sim | OK |
| Centro de Custos | ✅ Sim | OK |
| Configurações | ✅ Sim | OK |

### 1.2 O que precisa ser adicionado (igual Gestão Click)

**A. Opção de Vincular Cadastros entre Empresas**

Ao criar uma nova empresa, adicionar opção para vincular ou não os cadastros:

```typescript
// No cadastro de empresa, adicionar campos:
interface EmpresaVinculacao {
  vincular_produtos: boolean;      // Se true, produtos são compartilhados
  vincular_servicos: boolean;      // Se true, serviços são compartilhados
  vincular_clientes: boolean;      // Se true, clientes são compartilhados
  vincular_fornecedores: boolean;  // Se true, fornecedores são compartilhados
  empresas_vinculadas: string[];   // IDs das empresas para compartilhar
}
```

**B. Tabela de Vinculação de Cadastros**

Criar tabela no Supabase:

```sql
CREATE TABLE company_shared_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_company_id UUID REFERENCES companies(id),
  target_company_id UUID REFERENCES companies(id),
  entity_type TEXT NOT NULL, -- 'produtos', 'servicos', 'clientes', 'fornecedores'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**C. Modificar Queries para Respeitar Vinculação**

Nos hooks, verificar se há vinculação antes de filtrar:

```typescript
// Exemplo no usePessoas.ts
const fetchPessoas = async () => {
  // Buscar empresas vinculadas
  const { data: vinculadas } = await supabase
    .from('company_shared_entities')
    .select('source_company_id')
    .eq('target_company_id', currentCompany.id)
    .eq('entity_type', 'clientes');
  
  const companyIds = [currentCompany.id, ...vinculadas.map(v => v.source_company_id)];
  
  // Buscar de todas as empresas vinculadas
  const { data } = await supabase
    .from('pessoas')
    .select('*')
    .in('company_id', companyIds);
};
```

---

## 2. LISTAS SUSPENSAS SEM CAMPO DE BUSCA

### 2.1 Arquivos que precisam de Combobox com busca

**PRIORIDADE ALTA (listas grandes):**

| Arquivo | Campo | Descrição |
|---------|-------|-----------|
| `PayableForm.tsx` | Fornecedor | Lista de fornecedores |
| `PayablesFilters.tsx` | Fornecedor | Filtro por fornecedor |
| `ReceivablesFilters.tsx` | Cliente | Filtro por cliente |
| `PurchaseOrderForm.tsx` | Fornecedor | Seleção de fornecedor |
| `SaleFormDadosGerais.tsx` | Cliente | Seleção de cliente |
| `SmartQuotation.tsx` | Cliente | Seleção de cliente |
| `FornecedorCard.tsx` | Fornecedor | Seleção na importação |
| `TransportadorCard.tsx` | Transportadora | Seleção na importação |
| `DDABoletosList.tsx` | Fornecedor | Vincular boleto |
| `ServiceOrderFormDadosGerais.tsx` | Cliente | Seleção de cliente |

**PRIORIDADE MÉDIA (listas menores):**

| Arquivo | Campo | Descrição |
|---------|-------|-----------|
| `FinanceiroCard.tsx` | Plano de Contas | Seleção de conta |
| `PlanoContasList.tsx` | Conta Pai | Hierarquia |
| `BancosList.tsx` | Banco | Seleção de banco |
| `ProductFormDados.tsx` | Grupo | Grupo de produtos |
| `ProductFormFiscal.tsx` | NCM | Código NCM |

**PRIORIDADE BAIXA (listas fixas/pequenas):**

| Arquivo | Campo | Descrição |
|---------|-------|-----------|
| `ClienteFormDadosGerais.tsx` | Status | 3 opções fixas |
| `ClienteFormEndereco.tsx` | Estado | 27 UFs |
| `ClienteFormFiscal.tsx` | Regime | 4 opções |
| `EmpresaForm.tsx` | Regime | Opções fixas |
| `StatusConfigForm.tsx` | Tipo | Opções fixas |

### 2.2 Solução: Criar Componente SearchableSelect

Criar um componente reutilizável baseado no Command/Combobox:

```typescript
// src/components/shared/SearchableSelect.tsx

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onCreateNew?: () => void;
  createNewLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  onCreateNew,
  createNewLabel = "Cadastrar novo",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {selectedOption ? (
            <span className="truncate">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-muted-foreground ml-1">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {onCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateNew();
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createNewLabel}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.sublabel || ""}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.sublabel && (
                      <span className="text-xs text-muted-foreground">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### 2.3 Exemplo de Uso no PayableForm

```typescript
// Antes (Select simples):
<Select value={formData.supplierId} onValueChange={(v) => setFormData({...formData, supplierId: v})}>
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

// Depois (SearchableSelect com busca):
<SearchableSelect
  options={suppliers.map((s) => ({
    value: s.id,
    label: s.nome_fantasia || s.razao_social || "Sem nome",
    sublabel: s.cpf_cnpj,
  }))}
  value={formData.supplierId}
  onChange={(v) => setFormData({...formData, supplierId: v})}
  placeholder="Selecione o fornecedor"
  searchPlaceholder="Buscar por nome ou CNPJ..."
  onCreateNew={() => setShowCadastrarFornecedor(true)}
  createNewLabel="Cadastrar novo fornecedor"
/>
```

---

## 3. MELHORIAS NO CADASTRO DE CLIENTES

### 3.1 Problemas Atuais

1. **Falta validação de campos obrigatórios** - Não indica quais campos são obrigatórios
2. **Falta feedback visual** - Não mostra erros de validação inline
3. **Consulta CNPJ lenta** - Não tem indicador de progresso claro
4. **Falta busca por CEP** - Não preenche endereço automaticamente
5. **Contatos limitados** - Interface de contatos pode melhorar

### 3.2 Melhorias Propostas

**A. Adicionar Consulta de CEP**

```typescript
// Em ClienteFormEndereco.tsx, adicionar:
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
        complemento: data.complemento || formData.complemento,
      });
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
  } finally {
    setLoadingCep(false);
  }
};
```

**B. Validação de Campos Obrigatórios**

```typescript
// Adicionar validação antes de salvar:
const validateCliente = (data: any): string[] => {
  const errors: string[] = [];
  
  if (!data.razao_social?.trim()) {
    errors.push("Razão Social / Nome é obrigatório");
  }
  
  if (!data.cpf_cnpj?.trim()) {
    errors.push("CPF/CNPJ é obrigatório");
  }
  
  if (data.tipo_pessoa === 'PJ' && data.cpf_cnpj?.length !== 14) {
    errors.push("CNPJ inválido");
  }
  
  if (data.tipo_pessoa === 'PF' && data.cpf_cnpj?.length !== 11) {
    errors.push("CPF inválido");
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push("E-mail inválido");
  }
  
  return errors;
};
```

**C. Indicadores Visuais de Campos Obrigatórios**

```typescript
// Adicionar asterisco nos labels de campos obrigatórios:
<Label htmlFor="razao_social">
  {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} 
  <span className="text-destructive ml-1">*</span>
</Label>
```

**D. Melhorar Interface de Contatos**

```typescript
// Adicionar tipos de contato:
const tiposContato = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'compras', label: 'Compras' },
  { value: 'diretoria', label: 'Diretoria' },
  { value: 'outro', label: 'Outro' },
];

// Adicionar campo de departamento/setor no contato
interface ClienteContato {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;  // NOVO
  tipo: string;          // NOVO
  principal: boolean;
}
```

---

## 4. RESUMO DE ARQUIVOS A ALTERAR

### Novos Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/shared/SearchableSelect.tsx` | Componente de select com busca |
| `supabase/migrations/xxx_company_shared_entities.sql` | Tabela de vinculação |

### Arquivos a Modificar (Prioridade Alta)

| Arquivo | Alteração |
|---------|-----------|
| `PayableForm.tsx` | Trocar Select por SearchableSelect |
| `PayablesFilters.tsx` | Trocar Select por SearchableSelect |
| `ReceivablesFilters.tsx` | Trocar Select por SearchableSelect |
| `PurchaseOrderForm.tsx` | Trocar Select por SearchableSelect |
| `SaleFormDadosGerais.tsx` | Trocar Select por SearchableSelect |
| `SmartQuotation.tsx` | Trocar Select por SearchableSelect |
| `FornecedorCard.tsx` | Trocar Select por SearchableSelect |
| `TransportadorCard.tsx` | Trocar Select por SearchableSelect |
| `DDABoletosList.tsx` | Trocar Select por SearchableSelect |
| `ServiceOrderFormDadosGerais.tsx` | Trocar Select por SearchableSelect |
| `ClienteFormEndereco.tsx` | Adicionar busca por CEP |
| `ClienteFormDadosGerais.tsx` | Adicionar validação e asteriscos |
| `ClienteFormContatos.tsx` | Adicionar tipo e departamento |
| `EmpresaForm.tsx` | Adicionar opções de vinculação |

---

## 5. PROMPT PARA O LOVABLE

Copie e cole isso no Lovable:

---

Preciso de várias alterações no sistema:

### 1. Criar componente SearchableSelect

Criar `src/components/shared/SearchableSelect.tsx` - um componente de select com campo de busca integrado, baseado no Command/Combobox do shadcn/ui. Deve aceitar:
- Lista de opções com value, label e sublabel opcional
- Placeholder customizável
- Opção de "Cadastrar novo" com callback
- Busca por texto no label e sublabel

### 2. Substituir Selects por SearchableSelect

Nos seguintes arquivos, substituir os Select de fornecedor/cliente/transportadora pelo novo SearchableSelect:
- PayableForm.tsx (fornecedor)
- PayablesFilters.tsx (fornecedor)
- ReceivablesFilters.tsx (cliente)
- PurchaseOrderForm.tsx (fornecedor)
- SaleFormDadosGerais.tsx (cliente)
- SmartQuotation.tsx (cliente)
- FornecedorCard.tsx (fornecedor)
- TransportadorCard.tsx (transportadora)
- DDABoletosList.tsx (fornecedor)
- ServiceOrderFormDadosGerais.tsx (cliente)

### 3. Melhorar cadastro de clientes

- Em ClienteFormEndereco.tsx: Adicionar botão de busca por CEP usando a API ViaCEP
- Em ClienteFormDadosGerais.tsx: Adicionar asterisco vermelho nos campos obrigatórios (Razão Social, CPF/CNPJ)
- Em ClienteFormContatos.tsx: Adicionar campo "Tipo de Contato" (Comercial, Financeiro, Técnico, etc) e "Departamento"

### 4. Segregação de empresas (opcional, pode fazer depois)

Criar tabela `company_shared_entities` para permitir compartilhar cadastros entre empresas, similar ao Gestão Click.

---
