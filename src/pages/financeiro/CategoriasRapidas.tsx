import { PageHeader } from '@/components/shared';
import { CategoriasRapidasList } from '@/components/financeiro';

export default function CategoriasRapidas() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias Rápidas"
        description="Atalhos para lançamentos com conta e centro de custo pré-definidos"
      />
      <CategoriasRapidasList />
    </div>
  );
}
