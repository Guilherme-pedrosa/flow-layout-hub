import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierForm, SuppliersList } from "@/components/fornecedores";
import { Supplier } from "@/hooks/useSuppliers";

export default function Fornecedores() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const {
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
  } = useSuppliers();

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (data: any) => {
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, ...data });
    } else {
      await createSupplier.mutateAsync(data);
    }
    handleCancel();
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleSupplierStatus.mutate({ id, is_active: isActive });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Cadastro e gestão de fornecedores"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Fornecedores" },
        ]}
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          )
        }
      />

      {showForm ? (
        <SupplierForm
          supplier={editingSupplier}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createSupplier.isPending || updateSupplier.isPending}
        />
      ) : (
        <SuppliersList
          suppliers={suppliers}
          isLoading={isLoading}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
}
