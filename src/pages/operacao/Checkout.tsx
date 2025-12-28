import { PageHeader } from "@/components/shared";
import { ShoppingCart } from "lucide-react";

export default function Checkout() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Checkout"
        description="Finalize vendas e baixe estoque automaticamente"
        breadcrumbs={[
          { label: "Operação" },
          { label: "Checkout" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Checkout</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Módulo de finalização de vendas com baixa automática de estoque.
        </p>
      </div>
    </div>
  );
}
