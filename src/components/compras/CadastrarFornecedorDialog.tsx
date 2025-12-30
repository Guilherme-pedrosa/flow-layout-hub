import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { NFEFornecedor, Transportador } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CadastrarFornecedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dados: NFEFornecedor | Transportador | null;
  tipo: "fornecedor" | "transportador";
  onSuccess: (pessoaId?: string) => void;
}

export function CadastrarFornecedorDialog({
  open,
  onOpenChange,
  dados,
  tipo,
  onSuccess,
}: CadastrarFornecedorDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  if (!dados) return null;

  const isFornecedor = tipo === "fornecedor";
  const fornecedor = dados as NFEFornecedor;
  const transportador = dados as Transportador;

  const handleCadastrar = async () => {
    setLoading(true);
    try {
      // Cadastrar na tabela pessoas (unificada)
      const pessoaData = isFornecedor
        ? {
            tipo_pessoa: "PJ" as const,
            cpf_cnpj: fornecedor.cnpj,
            razao_social: fornecedor.razaoSocial,
            nome_fantasia: fornecedor.nomeFantasia,
            inscricao_estadual: fornecedor.inscricaoEstadual,
            logradouro: fornecedor.endereco,
            bairro: fornecedor.bairro,
            cidade: fornecedor.cidade,
            estado: fornecedor.uf,
            cep: fornecedor.cep,
            telefone: fornecedor.telefone,
            email: fornecedor.email,
            status: "ativo" as const,
            is_active: true,
            is_fornecedor: true,
            is_cliente: false,
            is_colaborador: false,
            is_transportadora: false,
          }
        : {
            tipo_pessoa: transportador.cnpj?.length === 11 ? "PF" as const : "PJ" as const,
            cpf_cnpj: transportador.cnpj,
            razao_social: transportador.razaoSocial,
            inscricao_estadual: transportador.inscricaoEstadual,
            logradouro: transportador.endereco,
            cidade: transportador.cidade,
            estado: transportador.uf,
            status: "ativo" as const,
            is_active: true,
            is_fornecedor: false,
            is_cliente: false,
            is_colaborador: false,
            is_transportadora: true,
          };

      const { data, error } = await supabase
        .from("pessoas")
        .insert(pessoaData)
        .select("id")
        .single();

      if (error) throw error;

      // Invalidar cache do react-query para atualizar todas as listas
      await queryClient.invalidateQueries({ queryKey: ["pessoas"] });

      toast.success(`${isFornecedor ? "Fornecedor" : "Transportador"} cadastrado com sucesso!`);
      onSuccess(data?.id);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Cadastrar {isFornecedor ? "Fornecedor" : "Transportador"}
          </DialogTitle>
          <DialogDescription>
            Os dados abaixo serão usados para criar o cadastro no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">CNPJ/CPF</Label>
            <Input
              value={isFornecedor ? fornecedor.cnpj : transportador.cnpj}
              readOnly
              className="col-span-3 bg-muted"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Razão Social</Label>
            <Input
              value={isFornecedor ? fornecedor.razaoSocial : transportador.razaoSocial}
              readOnly
              className="col-span-3 bg-muted"
            />
          </div>
          {isFornecedor && fornecedor.nomeFantasia && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Nome Fantasia</Label>
              <Input
                value={fornecedor.nomeFantasia}
                readOnly
                className="col-span-3 bg-muted"
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Cidade/UF</Label>
            <Input
              value={`${isFornecedor ? fornecedor.cidade : transportador.cidade}/${isFornecedor ? fornecedor.uf : transportador.uf}`}
              readOnly
              className="col-span-3 bg-muted"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCadastrar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
