import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePessoas, Pessoa, PessoaInsert } from "@/hooks/usePessoas";
import { SupplierForm, SuppliersList } from "@/components/fornecedores";

export default function Fornecedores() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Pessoa | null>(null);

  const {
    fornecedores,
    isLoadingFornecedores,
    createPessoa,
    updatePessoa,
    toggleStatus,
  } = usePessoas();

  const handleEdit = (supplier: Pessoa) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (data: Partial<PessoaInsert>) => {
    if (editingSupplier) {
      await updatePessoa.mutateAsync({ id: editingSupplier.id, data });
    } else {
      await createPessoa.mutateAsync({
        ...data,
        is_fornecedor: true,
      });
    }
    handleCancel();
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleStatus.mutate({ id, is_active: isActive });
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
          isLoading={createPessoa.isPending || updatePessoa.isPending}
        />
      ) : (
        <SuppliersList
          suppliers={fornecedores}
          isLoading={isLoadingFornecedores}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
}
