# Integração WAI — Faturamento (OS → Financeiro)

> **Versão:** 1.0  
> **Data:** 2026-01-07  
> **Status:** Produção  

---

## 🎯 Princípio Central

| Sistema | Papel |
|---------|-------|
| **WAI** | System of Record (controle financeiro) |
| **Field Control** | Camada de execução (não participa do faturamento) |

### ⚠️ Regra Fundamental (Imutável)

> **O faturamento acontece exclusivamente no WAI.**  
> O Field Control **nunca recebe, gera ou valida** informações financeiras.

**Regra de ouro:**
- OS concluída no Field → **libera** para faturamento no WAI
- Faturamento = criação de documento fiscal + financeiro
- Estorno financeiro ≠ estorno físico (são processos distintos)
- OS faturada = **bloqueada** para alterações

---

## 1️⃣ Pré-requisitos para Faturamento

### Checklist Obrigatório

| Requisito | Verificação | Bloqueante |
|-----------|-------------|------------|
| OS concluída | `status = 'concluida'` | ✔️ SIM |
| Consumo processado | Todos os itens do webhook registrados | ✔️ SIM |
| Estoque sem anomalia crítica | Sem estoque negativo não tratado | ✔️ SIM |
| Cliente ativo | `clientes.status = 'ativo'` | ⚠️ ALERTA |
| Dados fiscais completos | CNPJ/CPF, endereço, IE | Depende do tipo de documento |

### Fluxo de Verificação

```
┌─────────────────────────────────────────────────────────────────┐
│              PRÉ-FATURAMENTO: CHECKLIST                         │
└─────────────────────────────────────────────────────────────────┘

  Solicitar Faturamento
         │
         ▼
  ┌──────────────┐     NÃO
  │ OS concluída?│────────────▶ BLOQUEIA
  └──────┬───────┘
         │ SIM
         ▼
  ┌──────────────┐     NÃO
  │ Consumo OK?  │────────────▶ BLOQUEIA
  └──────┬───────┘
         │ SIM
         ▼
  ┌──────────────┐     SIM
  │Estoque negat?│────────────▶ BLOQUEIA + ALERTA
  └──────┬───────┘
         │ NÃO
         ▼
  ┌──────────────┐     NÃO
  │Cliente ativo?│────────────▶ ALERTA (não bloqueia)
  └──────┬───────┘
         │ SIM
         ▼
    LIBERA FATURAMENTO
```

---

## 2️⃣ Composição do Faturamento

### Origem dos Valores

| Componente | Origem | Regra |
|------------|--------|-------|
| **Serviços** | `os_servicos` ou tipo de serviço | Preço da tabela/contrato |
| **Peças/Produtos** | `os_itens` (consumo) | Preço WAI (não do Field) |
| **Mão de obra** | Tempo real × taxa horária | Calculado no fechamento |
| **Deslocamento** | Configuração do cliente/contrato | Valor fixo ou por km |
| **Descontos** | Contrato ou aprovação manual | Aplicado sobre total |

### ⚠️ Regra sobre Preços

> O preço faturável **sempre vem do WAI** (tabela de preços, contrato do cliente).  
> O `unitPrice` do Field é **apenas referência/evidência**.  
> Isso garante consistência com política comercial e contratos.

### Estrutura de Cálculo

```
TOTAL_SERVICOS = SUM(os_servicos.valor)
TOTAL_PECAS = SUM(os_itens.quantidade × preco_tabela_wai)
TOTAL_MAO_OBRA = duration_real × taxa_horaria
TOTAL_DESLOCAMENTO = valor_fixo OU (distancia_km × valor_km)

SUBTOTAL = TOTAL_SERVICOS + TOTAL_PECAS + TOTAL_MAO_OBRA + TOTAL_DESLOCAMENTO
DESCONTO = aplicar_desconto(SUBTOTAL, regras_contrato)

TOTAL_FATURAMENTO = SUBTOTAL - DESCONTO
```

---

## 3️⃣ Tipos de Documento Fiscal

### Documentos Suportados

| Tipo | Quando usar | Requisitos |
|------|-------------|------------|
| **NFS-e** | Serviços | CNPJ/CPF, Inscrição Municipal |
| **NF-e** | Produtos/Peças | CNPJ, IE, dados completos |
| **Fatura Simples** | Sem nota fiscal | Mínimo: identificação do cliente |
| **Recibo** | Pessoa física, valor baixo | CPF |

### Regras por Tipo de Cliente

| Cliente | Serviços | Produtos |
|---------|----------|----------|
| PJ com IE | NFS-e | NF-e |
| PJ sem IE | NFS-e | NF-e (CFOP consumidor) |
| PF | NFS-e ou Recibo | NF-e consumidor ou Recibo |

---

## 4️⃣ Fluxo de Faturamento

### Ciclo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUXO DE FATURAMENTO                           │
└─────────────────────────────────────────────────────────────────┘

  OS Concluída                                            
       │                                                   
       ▼                                                   
  ┌──────────────┐                                         
  │ Verificações │                                         
  │ pré-fatura   │                                         
  └──────┬───────┘                                         
         │ OK                                              
         ▼                                                 
  ┌──────────────┐                                         
  │ Composição   │                                         
  │ de valores   │                                         
  └──────┬───────┘                                         
         │                                                 
         ▼                                                 
  ┌──────────────┐     ┌──────────────┐                    
  │ Gerar NFS-e  │────▶│ Gerar NF-e   │ (se houver peças)  
  │ (serviços)   │     │ (produtos)   │                    
  └──────┬───────┘     └──────┬───────┘                    
         │                    │                            
         └────────┬───────────┘                            
                  ▼                                        
         ┌──────────────┐                                  
         │ Criar títulos│                                  
         │ a receber    │                                  
         └──────┬───────┘                                  
                │                                          
                ▼                                          
         ┌──────────────┐                                  
         │ Atualizar OS │                                  
         │ status='fat' │                                  
         └──────┬───────┘                                  
                │                                          
                ▼                                          
         ┌──────────────┐                                  
         │ Audit log    │                                  
         └──────────────┘                                  
```

---

## 5️⃣ Bloqueios Pós-Faturamento

### O que é BLOQUEADO após faturar

| Ação | Permitida? | Alternativa |
|------|------------|-------------|
| Alterar itens consumidos | ❌ NÃO | Estornar fatura primeiro |
| Adicionar novos itens | ❌ NÃO | Estornar fatura primeiro |
| Alterar serviços | ❌ NÃO | Estornar fatura primeiro |
| Alterar valores | ❌ NÃO | Estornar fatura primeiro |
| Cancelar OS | ❌ NÃO | Estornar fatura primeiro |
| Visualizar OS | ✔️ SIM | — |
| Adicionar observações | ✔️ SIM | Apenas texto |
| Gerar 2ª via de nota | ✔️ SIM | — |

### ⛔ Regra Hard

> **OS FATURADA = IMUTÁVEL**  
> Qualquer alteração requer estorno da fatura primeiro.  
> Isso garante integridade fiscal e contábil.

---

## 6️⃣ Estorno de Fatura

### Tipos de Estorno

| Tipo | O que reverte | Quando usar |
|------|---------------|-------------|
| **Estorno Total** | Fatura + Títulos + Notas | Cancelamento completo |
| **Estorno Parcial** | Apenas valores específicos | Ajuste de valor |
| **Nota de Crédito** | Compensa valor em fatura futura | Crédito ao cliente |

### Fluxo de Estorno Total

```
┌─────────────────────────────────────────────────────────────────┐
│                  ESTORNO DE FATURA                              │
└─────────────────────────────────────────────────────────────────┘

  1. Solicitar estorno (com justificativa)
         │
         ▼
  2. Verificar permissão do usuário
         │
         ▼
  3. Cancelar/Inutilizar NF-e/NFS-e
         │
         ▼
  4. Baixar títulos a receber
     (se não pagos: cancelar)
     (se pagos: gerar crédito ou devolução)
         │
         ▼
  5. Atualizar OS: status = 'concluida' (volta estado anterior)
         │
         ▼
  6. Gerar audit_log com todos os detalhes
```

### ⚠️ Estorno Financeiro vs Estorno Físico

| Estorno | O que reverte | Quem faz |
|---------|---------------|----------|
| **Financeiro** | Fatura, títulos, notas | Financeiro/Admin |
| **Físico** | Consumo de peças, movimentações | Estoque + Financeiro |

> **São processos INDEPENDENTES.**  
> Estornar fatura **não reverte automaticamente** o consumo de peças.  
> Para devolver peças ao estoque, é necessário processo separado.

---

## 7️⃣ Títulos a Receber

### Geração de Títulos

Para cada fatura, gerar título(s) em `accounts_receivable`:

```sql
INSERT INTO accounts_receivable (
  company_id,
  client_id,
  sale_id,
  description,
  amount,
  due_date,
  issue_date,
  document_number,
  document_type,
  payment_method,
  is_paid
) VALUES (
  'company-uuid',
  'cliente-uuid',
  'sale-uuid',  -- ou os-uuid
  'OS 2024-00123 - Manutenção preventiva',
  1500.00,
  '2024-02-15',
  '2024-01-15',
  'NFS-e 12345',
  'nfse',
  'boleto',
  false
);
```

### Parcelamento

Se fatura parcelada:
- Gerar N títulos
- Cada título com `due_date` correspondente
- `document_number` inclui parcela (ex: `NFS-e 12345 - 1/3`)

### Vínculo OS ↔ Financeiro

| Tabela | Campo | Uso |
|--------|-------|-----|
| `ordens_servico` | `fatura_id` | Link para fatura |
| `accounts_receivable` | `sale_id` | Link para OS ou venda |
| `sales` | `ordem_servico_id` | Link reverso |

---

## 8️⃣ Status da OS vs Status Financeiro

### Mapeamento de Status

| Status OS | Status Financeiro | Descrição |
|-----------|-------------------|-----------|
| `rascunho` | — | Não faturável |
| `agendada` | — | Não faturável |
| `em_execucao` | — | Não faturável |
| `concluida` | `pendente_faturamento` | Liberada para faturar |
| `faturada` | `faturado` | Documento fiscal emitido |
| `faturada` | `parcialmente_pago` | Alguma parcela paga |
| `faturada` | `pago` | Totalmente quitado |
| `cancelada` | `cancelado` | Estorno realizado |

### Flag de Controle

```sql
-- Na tabela ordens_servico
faturada_em TIMESTAMPTZ,           -- quando foi faturada
fatura_id UUID,                    -- link para fatura/sale
situacao_financeira TEXT,          -- 'pendente', 'parcial', 'quitado'
```

---

## 9️⃣ Proibições (Anti-Patterns)

| ❌ Proibido | 💥 Consequência |
|-------------|-----------------|
| Faturar OS não concluída | Fatura sem lastro |
| Usar preço do Field | Inconsistência comercial |
| Alterar OS faturada | Divergência fiscal |
| Estornar sem justificativa | Furo de auditoria |
| Estornar fatura sem cancelar nota | Ilegalidade fiscal |
| Ignorar estoque negativo | Rombo financeiro |
| Faturar duas vezes | Duplicidade fiscal |

---

## 🔟 Idempotência de Faturamento

### Problema

Usuário pode clicar "Faturar" duas vezes.

### Solução

| Estratégia | Implementação |
|------------|---------------|
| Flag de controle | `os.faturada_em IS NOT NULL` |
| Lock otimista | Verificar flag antes de processar |
| Transação atômica | Tudo ou nada |

### Verificação

```sql
-- Antes de faturar
SELECT id, faturada_em FROM ordens_servico 
WHERE id = 'os-uuid' 
FOR UPDATE;

IF faturada_em IS NOT NULL THEN
  RAISE EXCEPTION 'OS já faturada em %', faturada_em;
END IF;
```

---

## 1️⃣1️⃣ Observabilidade

### Audit Logs Obrigatórios

| Evento | action | metadata |
|--------|--------|----------|
| Fatura gerada | `invoice_created` | `{ os_id, total, items }` |
| NFS-e emitida | `nfse_issued` | `{ numero, valor, prefeitura }` |
| NF-e emitida | `nfe_issued` | `{ chave, numero, valor }` |
| Título gerado | `receivable_created` | `{ due_date, amount }` |
| Fatura estornada | `invoice_reversed` | `{ reason, reversed_by }` |
| Título pago | `receivable_paid` | `{ paid_amount, paid_at }` |

### Exemplo de Registro

```json
{
  "action": "invoice_created",
  "entity_id": "os-uuid",
  "entity_type": "service_order",
  "metadata": {
    "fatura_id": "fatura-uuid",
    "total_servicos": 500.00,
    "total_pecas": 180.00,
    "total_mao_obra": 200.00,
    "desconto": 50.00,
    "total_fatura": 830.00,
    "parcelas": 2,
    "nfse_numero": "12345",
    "nfe_chave": "35240112345678..."
  }
}
```

---

## 1️⃣2️⃣ Integrações Fiscais

### NFS-e (Serviços)

| Campo | Origem |
|-------|--------|
| Tomador | `clientes` |
| Serviço | `tipos_servico` ou descrição |
| Valor | Soma de serviços + mão de obra |
| ISS | Configuração do município |

### NF-e (Produtos)

| Campo | Origem |
|-------|--------|
| Destinatário | `clientes` |
| Itens | `os_itens` (produtos consumidos) |
| CFOP | Configuração do produto/operação |
| Impostos | NCM + regime tributário |

### Dependência

> Faturamento fiscal depende de:
> - Certificado digital válido
> - Configuração de ambiente (produção/homologação)
> - Dados cadastrais completos do cliente

---

## 🔑 Resumo Executivo

> **O faturamento acontece exclusivamente no WAI, após OS concluída e consumo processado. Valores são calculados com base em tabelas do WAI (não do Field). OS faturada fica bloqueada para alterações. Estorno requer processo formal com justificativa e não reverte automaticamente o consumo físico de peças. Toda operação é auditada.**

---

## Referências

- [Integração WAI-Field: OS](./INTEGRACAO_WAI_FIELD_OS.md)
- [Integração WAI-Field: Estoque](./INTEGRACAO_WAI_FIELD_ESTOQUE.md)
- [Integração WAI-Field: Clientes](./INTEGRACAO_WAI_FIELD_CLIENTES.md)
- [WAI Observer Architecture](./WAI_OBSERVER_AI_ARCHITECTURE.md)
