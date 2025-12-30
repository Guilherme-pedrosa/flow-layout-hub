import { PageHeader } from "@/components/shared";
import { CommissionsPanel } from "@/components/vendas";

export default function Comissoes() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Apuração de Comissões"
        description="Calcule e gerencie comissões de vendedores"
        breadcrumbs={[{ label: "Vendas" }, { label: "Comissões" }]}
      />

      <CommissionsPanel />
    </div>
  );
}
