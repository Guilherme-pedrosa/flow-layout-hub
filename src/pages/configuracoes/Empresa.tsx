import { PageHeader } from "@/components/shared";
import { EmpresaForm } from "@/components/configuracoes";

const Empresa = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Empresa"
        description="Dados da empresa"
        breadcrumbs={[{ label: "Configurações" }, { label: "Empresa" }]}
      />
      <EmpresaForm />
    </div>
  );
};

export default Empresa;
