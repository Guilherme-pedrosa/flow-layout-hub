import { PageHeader } from '@/components/shared';
import { PlanoContasList } from '@/components/financeiro';

export default function PlanoContas() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas"
        description="Gerencie o plano de contas contábil da empresa"
      />
      <PlanoContasList />
    </div>
  );
}
