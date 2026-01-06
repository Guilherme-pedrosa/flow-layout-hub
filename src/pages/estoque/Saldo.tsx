import { PageHeader } from "@/components/shared";
import { SaldoEstoqueList } from "@/components/estoque";

export default function Saldo() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo de Estoque"
        description="Visualize o saldo atual de produtos em estoque (somente leitura)"
        breadcrumbs={[
          { label: "Estoque" },
          { label: "Saldo" },
        ]}
      />

      <SaldoEstoqueList />
    </div>
  );
}
