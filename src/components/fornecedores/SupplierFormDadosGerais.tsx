import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { consultarCnpj } from "@/lib/api/cnpj";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SupplierFormDadosGeraisProps {
  form: UseFormReturn<any>;
}

export function SupplierFormDadosGerais({ form }: SupplierFormDadosGeraisProps) {
  const [consultingCnpj, setConsultingCnpj] = useState(false);
  const { register, setValue, watch, formState: { errors } } = form;

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
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
              <Label>{tipoPessoa === "PJ" ? "Razão Social *" : "Nome Completo *"}</Label>
              <Input {...register("razao_social")} placeholder={tipoPessoa === "PJ" ? "" : "Nome completo"} />
              {errors.razao_social && (
                <span className="text-sm text-destructive">{String(errors.razao_social.message)}</span>
              )}
            </div>
          </div>

          {tipoPessoa === "PJ" && (
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tipoPessoa === "PJ" && (
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input {...register("inscricao_municipal")} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register("telefone")} />
            </div>

            <div className={`space-y-2 ${tipoPessoa === "PF" ? "md:col-span-2" : ""}`}>
              <Label>E-mail</Label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <span className="text-sm text-destructive">{String(errors.email.message)}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Condições Comerciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condição de Pagamento Padrão</Label>
              <Select
                value={watch("condicao_pagamento") || ""}
                onValueChange={(value) => setValue("condicao_pagamento", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_vista">À Vista</SelectItem>
                  <SelectItem value="7_dias">7 Dias</SelectItem>
                  <SelectItem value="14_dias">14 Dias</SelectItem>
                  <SelectItem value="21_dias">21 Dias</SelectItem>
                  <SelectItem value="28_dias">28 Dias</SelectItem>
                  <SelectItem value="30_dias">30 Dias</SelectItem>
                  <SelectItem value="30_60_dias">30/60 Dias</SelectItem>
                  <SelectItem value="30_60_90_dias">30/60/90 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Limite de Crédito</Label>
              <Input
                type="number"
                step="0.01"
                {...register("limite_credito", { valueAsNumber: true })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Internas</Label>
            <Textarea {...register("observacoes_internas")} rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
