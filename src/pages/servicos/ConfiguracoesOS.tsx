import { PageHeader } from "@/components/shared";
import { StatusConfigList } from "@/components/configuracoes/StatusConfigList";
import { useServiceOrderStatuses } from "@/hooks/useServiceOrders";
import { StatusFormData } from "@/components/configuracoes/StatusConfigForm";

const TEMP_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const ConfiguracoesOS = () => {
  const { statuses, isLoading, createStatus, updateStatus, deleteStatus } = useServiceOrderStatuses();

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
        title="Configurações de OS"
        description="Gerencie os status e comportamentos das ordens de serviço"
        breadcrumbs={[{ label: "Serviços" }, { label: "Configurações" }]}
      />

      <StatusConfigList
        title="Status de Ordens de Serviço"
        description="Configure os status disponíveis para OS, definindo como cada um afeta estoque, financeiro e checkout"
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

export default ConfiguracoesOS;
