import { ReceivablesPage } from "@/components/financeiro/ReceivablesPage";

export default function ContasReceber() {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Início</span>
        <span>›</span>
        <span>Financeiro</span>
        <span>›</span>
        <span className="text-foreground">Contas a Receber</span>
      </nav>

      <ReceivablesPage />
    </div>
  );
}
