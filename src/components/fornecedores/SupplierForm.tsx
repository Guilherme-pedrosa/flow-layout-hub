import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pessoa, PessoaInsert } from "@/hooks/usePessoas";
import { SupplierFormDadosGerais } from "./SupplierFormDadosGerais";
import { SupplierFormEnderecos } from "./SupplierFormEnderecos";
import { SupplierFormContatos } from "./SupplierFormContatos";
import { SupplierFormBancario } from "./SupplierFormBancario";
import { SupplierFormHistorico } from "./SupplierFormHistorico";

const supplierSchema = z.object({
  tipo_pessoa: z.enum(["PF", "PJ"]),
  cpf_cnpj: z.string().optional(),
  razao_social: z.string().min(1, "Razão social é obrigatória"),
  nome_fantasia: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  observacoes_internas: z.string().optional(),
  condicao_pagamento: z.string().optional(),
  limite_credito: z.number().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  supplier?: Pessoa | null;
  onSubmit: (data: Partial<PessoaInsert>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SupplierForm({ supplier, onSubmit, onCancel, isLoading }: SupplierFormProps) {
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      tipo_pessoa: supplier?.tipo_pessoa || "PJ",
      cpf_cnpj: supplier?.cpf_cnpj || "",
      razao_social: supplier?.razao_social || "",
      nome_fantasia: supplier?.nome_fantasia || "",
      inscricao_estadual: supplier?.inscricao_estadual || "",
      inscricao_municipal: supplier?.inscricao_municipal || "",
      logradouro: supplier?.logradouro || "",
      numero: supplier?.numero || "",
      complemento: supplier?.complemento || "",
      bairro: supplier?.bairro || "",
      cidade: supplier?.cidade || "",
      estado: supplier?.estado || "",
      cep: supplier?.cep || "",
      telefone: supplier?.telefone || "",
      email: supplier?.email || "",
      observacoes_internas: supplier?.observacoes_internas || "",
      condicao_pagamento: supplier?.condicao_pagamento || "",
      limite_credito: supplier?.limite_credito || undefined,
    },
  });

  const onFormSubmit = (data: SupplierFormData) => {
    onSubmit({
      tipo_pessoa: data.tipo_pessoa,
      cpf_cnpj: data.cpf_cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      inscricao_estadual: data.inscricao_estadual,
      inscricao_municipal: data.inscricao_municipal,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      cep: data.cep,
      telefone: data.telefone,
      email: data.email,
      observacoes_internas: data.observacoes_internas,
      condicao_pagamento: data.condicao_pagamento,
      limite_credito: data.limite_credito,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="enderecos">Endereços</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="bancario">Dados Bancários</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <SupplierFormDadosGerais form={form} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {supplier ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="enderecos">
          <SupplierFormEnderecos pessoaId={supplier?.id} />
        </TabsContent>

        <TabsContent value="contatos">
          <SupplierFormContatos pessoaId={supplier?.id} />
        </TabsContent>

        <TabsContent value="bancario">
          <SupplierFormBancario pessoaId={supplier?.id} />
        </TabsContent>

        <TabsContent value="historico">
          <SupplierFormHistorico pessoaId={supplier?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
