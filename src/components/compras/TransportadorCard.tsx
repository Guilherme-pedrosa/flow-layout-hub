import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Check } from "lucide-react";
import { Transportador } from "./types";

interface TransportadorCardProps {
  transportador: Transportador | null;
  transportadorCadastrado: boolean;
  onCadastrar: () => void;
}

export function TransportadorCard({ transportador, transportadorCadastrado, onCadastrar }: TransportadorCardProps) {
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
            {transportador === null ? "Sem frete / Frete por conta do emitente" : "Não informado na nota"}
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transportador
          </CardTitle>
          {hasTransportador && (
            transportadorCadastrado ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Check className="h-3 w-3 mr-1" />
                Cadastrado
              </Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={onCadastrar}>
                <Plus className="h-3 w-3 mr-1" />
                Cadastrar
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p><strong>Modalidade:</strong> {transportador.modalidadeFrete}</p>
        {hasTransportador && (
          <>
            {transportador.cnpj && <p><strong>CNPJ/CPF:</strong> {formatCNPJ(transportador.cnpj)}</p>}
            {transportador.razaoSocial && <p><strong>Nome:</strong> {transportador.razaoSocial}</p>}
            {transportador.inscricaoEstadual && <p><strong>IE:</strong> {transportador.inscricaoEstadual}</p>}
            {transportador.endereco && <p><strong>Endereço:</strong> {transportador.endereco}</p>}
            {transportador.cidade && <p><strong>Cidade/UF:</strong> {transportador.cidade}/{transportador.uf}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
