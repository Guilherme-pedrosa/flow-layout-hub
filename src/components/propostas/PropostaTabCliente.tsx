import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { useClientes } from "@/hooks/useClientes";
import { useCompany } from "@/contexts/CompanyContext";
import { Proposal } from "@/hooks/useProposals";

interface PropostaTabClienteProps {
  proposal: Proposal;
  onChange: (proposal: Proposal) => void;
}

export function PropostaTabCliente({ proposal, onChange }: PropostaTabClienteProps) {
  const { fetchClientes, loading } = useClientes();
  const { currentCompany } = useCompany();
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    if (currentCompany?.id) {
      fetchClientes().then(setClientes);
    }
  }, [currentCompany?.id]);

  const clienteOptions = clientes?.map((c) => ({
    value: c.id,
    label: c.razao_social || c.nome_fantasia || "Sem nome",
    sublabel: c.cpf_cnpj || undefined,
  })) || [];

  const handleClienteSelect = (clienteId: string) => {
    const cliente = clientes?.find((c) => c.id === clienteId);
    if (cliente) {
      onChange({
        ...proposal,
        cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || cliente.nome_fantasia || "",
        cliente_cnpj_cpf: cliente.cpf_cnpj || "",
        cliente_endereco: [
          cliente.logradouro,
          cliente.numero,
          cliente.bairro,
          cliente.cidade,
          cliente.estado,
          cliente.cep,
        ].filter(Boolean).join(", "),
        cliente_email: cliente.email || "",
        cliente_telefone: cliente.telefone || "",
        cliente_contato: "",
      });
    }
  };

  const handleFieldChange = (field: keyof Proposal, value: string) => {
    onChange({ ...proposal, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchableSelect
            options={clienteOptions}
            value={proposal.cliente_id || ""}
            onChange={handleClienteSelect}
            placeholder="Buscar cliente cadastrado..."
            searchPlaceholder="Digite para buscar..."
            emptyMessage="Nenhum cliente encontrado"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Nome / Razão Social</Label>
              <Input
                id="cliente_nome"
                value={proposal.cliente_nome || ""}
                onChange={(e) => handleFieldChange("cliente_nome", e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_cnpj_cpf">CNPJ / CPF</Label>
              <Input
                id="cliente_cnpj_cpf"
                value={proposal.cliente_cnpj_cpf || ""}
                onChange={(e) => handleFieldChange("cliente_cnpj_cpf", e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_endereco">Endereço</Label>
            <Textarea
              id="cliente_endereco"
              value={proposal.cliente_endereco || ""}
              onChange={(e) => handleFieldChange("cliente_endereco", e.target.value)}
              placeholder="Endereço completo"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_contato">Contato</Label>
              <Input
                id="cliente_contato"
                value={proposal.cliente_contato || ""}
                onChange={(e) => handleFieldChange("cliente_contato", e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_telefone">Telefone</Label>
              <Input
                id="cliente_telefone"
                value={proposal.cliente_telefone || ""}
                onChange={(e) => handleFieldChange("cliente_telefone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_email">E-mail</Label>
            <Input
              id="cliente_email"
              type="email"
              value={proposal.cliente_email || ""}
              onChange={(e) => handleFieldChange("cliente_email", e.target.value)}
              placeholder="email@empresa.com"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
