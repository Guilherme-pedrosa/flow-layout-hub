import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Search } from "lucide-react";
import { usePessoas, PessoaInsert } from "@/hooks/usePessoas";
import { consultarCnpj } from "@/lib/api/cnpj";
import { toast } from "sonner";

const pessoaSchema = z.object({
  tipo_pessoa: z.enum(["PF", "PJ"]),
  cpf_cnpj: z.string().optional(),
  razao_social: z.string().min(1, "Razão social é obrigatória"),
  nome_fantasia: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

type PessoaFormData = z.infer<typeof pessoaSchema>;

interface CadastrarPessoaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pessoaId: string) => void;
  tipo: "fornecedor" | "cliente" | "transportadora" | "colaborador";
  title?: string;
}

export function CadastrarPessoaDialog({
  open,
  onOpenChange,
  onSuccess,
  tipo,
  title,
}: CadastrarPessoaDialogProps) {
  const [consultingCnpj, setConsultingCnpj] = useState(false);
  const { createPessoa } = usePessoas();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PessoaFormData>({
    resolver: zodResolver(pessoaSchema),
    defaultValues: {
      tipo_pessoa: "PJ",
      cpf_cnpj: "",
      razao_social: "",
      nome_fantasia: "",
      email: "",
      telefone: "",
      cidade: "",
      estado: "",
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
        setValue("cidade", data.municipio || "");
        setValue("estado", data.uf || "");
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

  const getTipoLabel = () => {
    switch (tipo) {
      case "fornecedor":
        return "Fornecedor";
      case "cliente":
        return "Cliente";
      case "transportadora":
        return "Transportadora";
      case "colaborador":
        return "Colaborador";
      default:
        return "Pessoa";
    }
  };

  const onFormSubmit = async (data: PessoaFormData) => {
    try {
      const insertData: PessoaInsert = {
        tipo_pessoa: data.tipo_pessoa,
        cpf_cnpj: data.cpf_cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        email: data.email,
        telefone: data.telefone,
        cidade: data.cidade,
        estado: data.estado,
        is_fornecedor: tipo === "fornecedor",
        is_cliente: tipo === "cliente",
        is_transportadora: tipo === "transportadora",
        is_colaborador: tipo === "colaborador",
      };

      const result = await createPessoa.mutateAsync(insertData);
      reset();
      onOpenChange(false);
      onSuccess(result.id);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title || `Cadastrar ${getTipoLabel()}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Pessoa</Label>
            <RadioGroup
              value={tipoPessoa}
              onValueChange={(value) => setValue("tipo_pessoa", value as "PF" | "PJ")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PJ" id="dialog-pj" />
                <Label htmlFor="dialog-pj" className="cursor-pointer">
                  Pessoa Jurídica
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PF" id="dialog-pf" />
                <Label htmlFor="dialog-pf" className="cursor-pointer">
                  Pessoa Física
                </Label>
              </div>
            </RadioGroup>
          </div>

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

          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input {...register("razao_social")} />
            {errors.razao_social && (
              <span className="text-sm text-destructive">{errors.razao_social.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input {...register("nome_fantasia")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register("telefone")} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <span className="text-sm text-destructive">{errors.email.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input {...register("cidade")} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input {...register("estado")} maxLength={2} className="uppercase" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPessoa.isPending}>
              {createPessoa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
