import { PageHeader } from "@/components/shared";
import { EmpresasList } from "@/components/configuracoes";

const Empresa = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Empresas"
        description="Gerencie as empresas do sistema"
        breadcrumbs={[{ label: "Configurações" }, { label: "Empresas" }]}
      />
      <EmpresasList />
    </div>
  );
};

export default Empresa;
