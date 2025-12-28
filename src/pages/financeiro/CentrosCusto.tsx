import { PageHeader } from '@/components/shared';
import { CentroCustoList } from '@/components/financeiro';

export default function CentrosCusto() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Centros de Custo"
        description="Gerencie os centros de custo da empresa"
      />
      <CentroCustoList />
    </div>
  );
}
