import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Check } from "lucide-react";
import { NFEFornecedor } from "./types";

interface FornecedorCardProps {
  fornecedor: NFEFornecedor;
  fornecedorCadastrado: boolean;
  onCadastrar: () => void;
}

export function FornecedorCard({ fornecedor, fornecedorCadastrado, onCadastrar }: FornecedorCardProps) {
  const formatCNPJ = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Fornecedor
          </CardTitle>
          {fornecedorCadastrado ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Check className="h-3 w-3 mr-1" />
              Cadastrado
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={onCadastrar}>
              <Plus className="h-3 w-3 mr-1" />
              Cadastrar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p><strong>CNPJ:</strong> {formatCNPJ(fornecedor.cnpj)}</p>
        <p><strong>Razão Social:</strong> {fornecedor.razaoSocial}</p>
        {fornecedor.nomeFantasia && (
          <p><strong>Nome Fantasia:</strong> {fornecedor.nomeFantasia}</p>
        )}
        {fornecedor.inscricaoEstadual && (
          <p><strong>IE:</strong> {fornecedor.inscricaoEstadual}</p>
        )}
        <p><strong>Endereço:</strong> {fornecedor.endereco}, {fornecedor.bairro}</p>
        <p><strong>Cidade/UF:</strong> {fornecedor.cidade}/{fornecedor.uf}</p>
        {fornecedor.telefone && <p><strong>Telefone:</strong> {fornecedor.telefone}</p>}
        {fornecedor.email && <p><strong>E-mail:</strong> {fornecedor.email}</p>}
      </CardContent>
    </Card>
  );
}
