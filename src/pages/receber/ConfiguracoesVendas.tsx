import { PageHeader } from "@/components/shared";
import { StatusConfigList } from "@/components/configuracoes/StatusConfigList";
import { useSaleStatuses } from "@/hooks/useSales";
import { StatusFormData } from "@/components/configuracoes/StatusConfigForm";

const TEMP_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const ConfiguracoesVendas = () => {
  const { statuses, isLoading, createStatus, updateStatus, deleteStatus } = useSaleStatuses();

  const handleCreateStatus = (data: StatusFormData & { company_id: string }) => {
    createStatus.mutate(data as any);
  };

  const handleUpdateStatus = (id: string, data: Partial<StatusFormData>) => {
    updateStatus.mutate({ id, data: data as any });
  };

  const handleDeleteStatus = (id: string) => {
    deleteStatus.mutate(id);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Configurações de Vendas"
        description="Gerencie os status e comportamentos das vendas"
        breadcrumbs={[{ label: "Receber" }, { label: "Configurações" }]}
      />

      <StatusConfigList
        title="Status de Vendas"
        description="Configure os status disponíveis para vendas, definindo como cada um afeta estoque, financeiro e checkout"
        statuses={statuses}
        isLoading={isLoading}
        companyId={TEMP_COMPANY_ID}
        onCreateStatus={handleCreateStatus}
        onUpdateStatus={handleUpdateStatus}
        onDeleteStatus={handleDeleteStatus}
      />
    </div>
  );
};

export default ConfiguracoesVendas;
