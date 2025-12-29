import { PageHeader } from "@/components/shared";
import { ProdutosList } from "@/components/produtos";

export default function Produtos() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Cadastro e gestão de produtos"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Produtos" },
        ]}
      />
      <ProdutosList />
    </div>
  );
}
