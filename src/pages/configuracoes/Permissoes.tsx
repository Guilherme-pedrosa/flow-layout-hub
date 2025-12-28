import { PageHeader } from "@/components/shared";
import { UsuariosList } from "@/components/configuracoes";

const Permissoes = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Usuários e Permissões"
        description="Gerencie usuários e controle de acessos"
        breadcrumbs={[{ label: "Configurações" }, { label: "Usuários" }]}
      />
      <UsuariosList />
    </div>
  );
};

export default Permissoes;
