import { PageHeader } from "@/components/shared";
import { UserCog } from "lucide-react";

export default function Usuarios() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gestão de usuários do sistema"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Usuários" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <UserCog className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Usuários</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para gestão de usuários do sistema.
        </p>
      </div>
    </div>
  );
}
