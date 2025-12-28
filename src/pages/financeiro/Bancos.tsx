import { PageHeader } from "@/components/shared";
import { BancosList } from "@/components/financeiro";

const Bancos = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas Bancárias"
        description="Gerencie as contas de caixa e bancárias da empresa"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Bancos" }]}
      />
      <BancosList />
    </div>
  );
};

export default Bancos;