import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pessoa, PessoaInsert } from "@/hooks/usePessoas";
import { consultarCnpj } from "@/lib/api/cnpj";
import { toast } from "sonner";

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
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  supplier?: Pessoa | null;
  onSubmit: (data: Partial<PessoaInsert>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SupplierForm({ supplier, onSubmit, onCancel, isLoading }: SupplierFormProps) {
  const [consultingCnpj, setConsultingCnpj] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
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
    },
  });

  const tipoPessoa = watch("tipo_pessoa");
  const cpfCnpj = watch("cpf_cnpj");

  const handleConsultCnpj = async () => {
    if (!cpfCnpj || cpfCnpj.length < 14) {
      toast.error("Digite um CNPJ válido");
      return;
    }

    setConsultingCnpj(true);
    try {
      const data = await consultarCnpj(cpfCnpj.replace(/\D/g, ""));
      if (data) {
        setValue("razao_social", data.nome || "");
        setValue("nome_fantasia", data.fantasia || "");
        setValue("logradouro", data.logradouro || "");
        setValue("numero", data.numero || "");
        setValue("complemento", data.complemento || "");
        setValue("bairro", data.bairro || "");
        setValue("cidade", data.municipio || "");
        setValue("estado", data.uf || "");
        setValue("cep", data.cep || "");
        setValue("telefone", data.telefone || "");
        setValue("email", data.email || "");
        toast.success("Dados do CNPJ carregados!");
      }
    } catch (error: any) {
      toast.error(`Erro ao consultar CNPJ: ${error.message}`);
    } finally {
      setConsultingCnpj(false);
    }
  };

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
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Pessoa</Label>
            <RadioGroup
              value={tipoPessoa}
              onValueChange={(value) => setValue("tipo_pessoa", value as "PF" | "PJ")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PJ" id="pj" />
                <Label htmlFor="pj" className="cursor-pointer">Pessoa Jurídica</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PF" id="pf" />
                <Label htmlFor="pf" className="cursor-pointer">Pessoa Física</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{tipoPessoa === "PJ" ? "CNPJ" : "CPF"}</Label>
              <div className="flex gap-2">
                <Input
                  {...register("cpf_cnpj")}
                  placeholder={tipoPessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                />
                {tipoPessoa === "PJ" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleConsultCnpj}
                    disabled={consultingCnpj}
                  >
                    {consultingCnpj ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Razão Social *</Label>
              <Input {...register("razao_social")} />
              {errors.razao_social && (
                <span className="text-sm text-destructive">{errors.razao_social.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome Fantasia</Label>
              <Input {...register("nome_fantasia")} />
            </div>

            <div className="space-y-2">
              <Label>Inscrição Estadual</Label>
              <Input {...register("inscricao_estadual")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register("telefone")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <span className="text-sm text-destructive">{errors.email.message}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input {...register("cep")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Logradouro</Label>
              <Input {...register("logradouro")} />
            </div>

            <div className="space-y-2">
              <Label>Número</Label>
              <Input {...register("numero")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input {...register("complemento")} />
            </div>

            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input {...register("bairro")} />
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input {...register("cidade")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input {...register("estado")} maxLength={2} className="uppercase" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea {...register("observacoes_internas")} rows={3} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {supplier ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
