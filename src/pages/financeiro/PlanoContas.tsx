import { PageHeader, AIBanner } from '@/components/shared';
import { PlanoContasList } from '@/components/financeiro';

/**
 * Tela de Plano de Contas
 * Rota: /configuracoes/plano-de-contas
 * 
 * Prompt 0.1 do WeDo ERP Spec v3.2
 * 
 * Comportamento:
 * - Tabela com Código, Descrição, Natureza (Receita/Despesa), Tipo (Sintética/Analítica)
 * - CRUD completo com modal
 * - Bloqueio de exclusão de contas com lançamentos associados
 * - Banner de IA com insights contextuais
 */
export default function PlanoContas() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas"
        description="Gerencie o plano de contas contábil. Defina como as receitas e despesas são categorizadas."
      />
      <PlanoContasList />
    </div>
  );
}
