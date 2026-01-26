import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Proposal } from "@/hooks/useProposals";
import { format, addDays } from "date-fns";

interface PropostaTabPropostaProps {
  proposal: Proposal;
  onChange: (proposal: Proposal) => void;
}

export function PropostaTabProposta({ proposal, onChange }: PropostaTabPropostaProps) {
  const handleFieldChange = (field: keyof Proposal, value: string | number) => {
    onChange({ ...proposal, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações da Proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={proposal.numero}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_emissao">Data de Emissão</Label>
              <Input
                id="data_emissao"
                type="date"
                value={proposal.data_emissao}
                onChange={(e) => handleFieldChange("data_emissao", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_validade">Data de Validade</Label>
              <Input
                id="data_validade"
                type="date"
                value={proposal.data_validade}
                onChange={(e) => handleFieldChange("data_validade", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Proposta</Label>
            <Input
              id="titulo"
              value={proposal.titulo}
              onChange={(e) => handleFieldChange("titulo", e.target.value)}
              placeholder="Ex: Proposta de Manutenção Preventiva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao_geral">Descrição Geral</Label>
            <Textarea
              id="descricao_geral"
              value={proposal.descricao_geral || ""}
              onChange={(e) => handleFieldChange("descricao_geral", e.target.value)}
              placeholder="Descrição detalhada dos serviços ou produtos oferecidos nesta proposta..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
            <Input
              id="forma_pagamento"
              value={proposal.forma_pagamento || ""}
              onChange={(e) => handleFieldChange("forma_pagamento", e.target.value)}
              placeholder="Ex: Boleto bancário, Transferência, Cartão"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condicoes_pagamento">Condições de Pagamento</Label>
            <Textarea
              id="condicoes_pagamento"
              value={proposal.condicoes_pagamento || ""}
              onChange={(e) => handleFieldChange("condicoes_pagamento", e.target.value)}
              placeholder="Ex: 30 dias após emissão da NF, à vista com 5% de desconto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_desconto">Desconto (R$)</Label>
              <Input
                id="valor_desconto"
                type="number"
                step="0.01"
                value={proposal.valor_desconto}
                onChange={(e) => handleFieldChange("valor_desconto", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                value={`R$ ${proposal.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Final</Label>
              <Input
                value={`R$ ${proposal.valor_final.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                disabled
                className="bg-muted font-bold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="observacoes"
            value={proposal.observacoes || ""}
            onChange={(e) => handleFieldChange("observacoes", e.target.value)}
            placeholder="Observações adicionais..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
