import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Check, Link } from "lucide-react";
import { NFEFornecedor } from "./types";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCpfCnpj } from "@/lib/formatters";
import { Label } from "@/components/ui/label";

interface Pessoa {
  id: string;
  razao_social: string | null;
  cpf_cnpj: string | null;
}

interface FornecedorCardProps {
  fornecedor: NFEFornecedor;
  fornecedorCadastrado: boolean;
  fornecedorId: string | null;
  fornecedoresDisponiveis?: Pessoa[];
  onCadastrar: () => void;
  onVincular?: (id: string) => void;
}

export function FornecedorCard({ 
  fornecedor, 
  fornecedorCadastrado, 
  fornecedorId,
  fornecedoresDisponiveis = [],
  onCadastrar,
  onVincular 
}: FornecedorCardProps) {
  const formatCNPJ = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  return (
    <Card className={!fornecedorCadastrado ? "border-destructive/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Fornecedor
            {!fornecedorCadastrado && (
              <span className="text-destructive text-xs font-normal">(obrigatório)</span>
            )}
          </CardTitle>
          {fornecedorCadastrado ? (
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
        </div>

        {/* Opção de vincular a fornecedor existente */}
        {!fornecedorCadastrado && fornecedoresDisponiveis.length > 0 && onVincular && (
          <div className="pt-3 border-t space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Link className="h-3 w-3" />
              Ou vincule a um fornecedor existente:
            </Label>
            <SearchableSelect
              options={fornecedoresDisponiveis.map((f) => ({
                value: f.id,
                label: f.razao_social || "Sem nome",
                sublabel: f.cpf_cnpj ? formatCpfCnpj(f.cpf_cnpj, f.cpf_cnpj.replace(/\D/g, '').length > 11 ? "PJ" : "PF") : undefined
              }))}
              value={fornecedorId || ""}
              onChange={onVincular}
              placeholder="Selecione um fornecedor..."
              searchPlaceholder="Buscar por nome ou CNPJ..."
              emptyMessage="Nenhum fornecedor encontrado"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
