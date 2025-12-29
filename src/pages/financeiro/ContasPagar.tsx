import { PageHeader } from "@/components/shared";
import { PayablesList } from "@/components/financeiro";

export default function ContasPagar() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie pagamentos e envie PIX para fornecedores"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Contas a Pagar" },
        ]}
      />
      <PayablesList />
    </div>
  );
}
