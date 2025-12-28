import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { ClientesList, ClienteForm } from "@/components/clientes";

export default function Clientes() {
  const { id, action } = useParams();

  // Novo cliente
  if (id === "novo") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Novo Cliente"
          description="Cadastre um novo cliente no sistema"
          breadcrumbs={[
            { label: "Cadastros" },
            { label: "Clientes", href: "/clientes" },
            { label: "Novo" },
          ]}
        />
        <ClienteForm />
      </div>
    );
  }

  // Editar cliente
  if (id && action === "editar") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Editar Cliente"
          description="Altere os dados do cliente"
          breadcrumbs={[
            { label: "Cadastros" },
            { label: "Clientes", href: "/clientes" },
            { label: "Editar" },
          ]}
        />
        <ClienteForm clienteId={id} />
      </div>
    );
  }

  // Visualizar cliente
  if (id) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detalhes do Cliente"
          description="Visualize os dados do cliente"
          breadcrumbs={[
            { label: "Cadastros" },
            { label: "Clientes", href: "/clientes" },
            { label: "Detalhes" },
          ]}
        />
        <ClienteForm clienteId={id} />
      </div>
    );
  }

  // Lista de clientes
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Cadastro e gestão de clientes"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Clientes" },
        ]}
      />
      <ClientesList />
    </div>
  );
}