import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServices, Service } from "@/hooks/useServices";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, Wrench } from "lucide-react";

const serviceSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  sale_price: z.number().min(0, "Preço deve ser positivo"),
  is_active: z.boolean(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  service?: Service | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ServiceForm({ service, onCancel, onSuccess }: ServiceFormProps) {
  const { createService, updateService } = useServices();
  const { currentCompany } = useCompany();
  const isEditing = !!service;

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: service?.code ?? "",
      description: service?.description ?? "",
      unit: service?.unit ?? "SV",
      sale_price: service?.sale_price ?? 0,
      is_active: service?.is_active ?? true,
    },
  });

  const onSubmit = async (data: ServiceFormData) => {
    if (!currentCompany) return;

    if (isEditing && service) {
      await updateService.mutateAsync({
        id: service.id,
        data,
      });
    } else {
      await createService.mutateAsync({
        code: data.code,
        description: data.description,
        unit: data.unit,
        sale_price: data.sale_price,
        is_active: data.is_active,
        company_id: currentCompany.id,
      });
    }
    onSuccess();
  };

  const isPending = createService.isPending || updateService.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Serviço" : "Novo Serviço"}
          </h2>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize os dados do serviço"
              : "Cadastre um novo serviço"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Dados do Serviço
              </CardTitle>
              <CardDescription>
                Informações básicas do serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SV001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SV, HR, UN" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unidade de medida (SV=Serviço, HR=Hora, UN=Unidade)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o serviço..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Venda</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativo</FormLabel>
                        <FormDescription>
                          Serviços inativos não aparecem nas listagens
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
