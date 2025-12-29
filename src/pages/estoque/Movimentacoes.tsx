import { PageHeader } from "@/components/shared";
import { MovimentacoesList } from "@/components/estoque";

export default function Movimentacoes() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Movimentações de Estoque"
        description="Histórico de entradas e saídas de estoque"
        breadcrumbs={[
          { label: "Estoque" },
          { label: "Movimentações" },
        ]}
      />
      <MovimentacoesList />
    </div>
  );
}
