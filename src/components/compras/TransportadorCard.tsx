import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Check, Link } from "lucide-react";
import { Transportador } from "./types";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCpfCnpj } from "@/lib/formatters";
import { Label } from "@/components/ui/label";

interface Pessoa {
  id: string;
  razao_social: string | null;
  cpf_cnpj: string | null;
}

interface TransportadorCardProps {
  transportador: Transportador | null;
  transportadorCadastrado: boolean;
  transportadorId: string | null;
  transportadoresDisponiveis?: Pessoa[];
  onCadastrar: () => void;
  onVincular?: (id: string) => void;
}

export function TransportadorCard({ 
  transportador, 
  transportadorCadastrado, 
  transportadorId,
  transportadoresDisponiveis = [],
  onCadastrar,
  onVincular 
}: TransportadorCardProps) {
  // Se não há transportador informado na nota, não é obrigatório
  if (!transportador) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transportador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem frete / Frete por conta do emitente
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return "-";
    if (cnpj.length === 14) {
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    if (cnpj.length === 11) {
      return cnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return cnpj;
  };

  const hasTransportador = transportador.cnpj || transportador.razaoSocial;

  // Se não tem CNPJ/nome, não é obrigatório cadastrar
  if (!hasTransportador) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transportador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Modalidade:</strong> {transportador.modalidadeFrete}</p>
          <p className="text-muted-foreground text-xs">Transportador não identificado na nota</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={!transportadorCadastrado ? "border-amber-500/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transportador
            {!transportadorCadastrado && (
              <span className="text-amber-600 text-xs font-normal">(recomendado)</span>
            )}
          </CardTitle>
          {transportadorCadastrado ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Check className="h-3 w-3 mr-1" />
              Vinculado
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={onCadastrar}>
              <Plus className="h-3 w-3 mr-1" />
              Cadastrar Novo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <p><strong>Modalidade:</strong> {transportador.modalidadeFrete}</p>
          {transportador.cnpj && <p><strong>CNPJ/CPF:</strong> {formatCNPJ(transportador.cnpj)}</p>}
          {transportador.razaoSocial && <p><strong>Nome:</strong> {transportador.razaoSocial}</p>}
          {transportador.inscricaoEstadual && <p><strong>IE:</strong> {transportador.inscricaoEstadual}</p>}
          {transportador.endereco && <p><strong>Endereço:</strong> {transportador.endereco}</p>}
          {transportador.cidade && <p><strong>Cidade/UF:</strong> {transportador.cidade}/{transportador.uf}</p>}
        </div>

        {/* Opção de vincular a transportador existente */}
        {!transportadorCadastrado && transportadoresDisponiveis.length > 0 && onVincular && (
          <div className="pt-3 border-t space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Link className="h-3 w-3" />
              Ou vincule a um transportador existente:
            </Label>
            <SearchableSelect
              options={transportadoresDisponiveis.map((t) => ({
                value: t.id,
                label: t.razao_social || "Sem nome",
                sublabel: t.cpf_cnpj ? formatCpfCnpj(t.cpf_cnpj, t.cpf_cnpj.replace(/\D/g, '').length > 11 ? "PJ" : "PF") : undefined
              }))}
              value={transportadorId || ""}
              onChange={onVincular}
              placeholder="Selecione um transportador..."
              searchPlaceholder="Buscar por nome ou CNPJ..."
              emptyMessage="Nenhum transportador encontrado"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
