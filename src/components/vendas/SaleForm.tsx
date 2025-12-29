import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, X, DollarSign, FileText } from "lucide-react";
import { SaleFormDadosGerais } from "./SaleFormDadosGerais";
import { SaleFormProdutos } from "./SaleFormProdutos";
import { SaleFormServicos } from "./SaleFormServicos";
import { SaleFormTransporte } from "./SaleFormTransporte";
import { useSales, SaleProductItem, SaleServiceItem } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";

interface SaleFormProps {
  onClose: () => void;
  initialData?: any;
}

export function SaleForm({ onClose, initialData }: SaleFormProps) {
  const { createSale } = useSales();
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id ?? '',
    seller_name: '',
    status_id: initialData?.status_id ?? '',
    sale_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    sales_channel: 'presencial',
    cost_center_id: '',
    quote_number: '',
    os_number: '',
    os_gc: '',
    extra_observation: '',
    freight_value: 0,
    carrier: '',
    show_delivery_address: false,
    delivery_address: {},
    discount_value: 0,
    discount_percent: 0,
    payment_type: 'avista',
    installments: 1,
    observations: '',
    internal_observations: '',
  });

  const [productItems, setProductItems] = useState<SaleProductItem[]>([]);
  const [serviceItems, setServiceItems] = useState<SaleServiceItem[]>([]);

  const productsTotal = productItems.reduce((sum, i) => sum + i.subtotal, 0);
  const servicesTotal = serviceItems.reduce((sum, i) => sum + i.subtotal, 0);
  const subtotal = productsTotal + servicesTotal + formData.freight_value;
  const discountAmount = formData.discount_percent > 0 
    ? subtotal * (formData.discount_percent / 100) 
    : formData.discount_value;
  const total = subtotal - discountAmount;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const sale = {
      company_id: '00000000-0000-0000-0000-000000000000', // TODO: pegar da empresa
      client_id: formData.client_id || null,
      status_id: formData.status_id || null,
      sale_date: formData.sale_date,
      delivery_date: formData.delivery_date || null,
      sales_channel: formData.sales_channel,
      cost_center_id: formData.cost_center_id || null,
      quote_number: formData.quote_number || null,
      os_number: formData.os_number || null,
      os_gc: formData.os_gc || null,
      extra_observation: formData.extra_observation || null,
      freight_value: formData.freight_value,
      carrier: formData.carrier || null,
      delivery_address: formData.show_delivery_address ? formData.delivery_address : null,
      products_total: productsTotal,
      services_total: servicesTotal,
      discount_value: formData.discount_value,
      discount_percent: formData.discount_percent,
      total_value: total,
      payment_type: formData.payment_type,
      installments: formData.installments,
      observations: formData.observations || null,
      internal_observations: formData.internal_observations || null,
    };

    await createSale.mutateAsync({
      sale,
      productItems: productItems.map(({ product, ...item }) => item),
      serviceItems,
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      <SaleFormDadosGerais formData={formData} onChange={handleChange} />
      <SaleFormProdutos items={productItems} onChange={setProductItems} />
      <SaleFormServicos items={serviceItems} onChange={setServiceItems} />
      <SaleFormTransporte formData={formData} onChange={handleChange} />

      {/* Totais */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5" />Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Produtos</Label>
              <Input value={formatCurrency(productsTotal)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Serviços</Label>
              <Input value={formatCurrency(servicesTotal)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input type="number" value={formData.discount_value} onChange={(e) => handleChange('discount_value', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input type="number" value={formData.discount_percent} onChange={(e) => handleChange('discount_percent', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Valor total</Label>
              <Input value={formatCurrency(total)} disabled className="bg-muted font-bold" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5" />Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={formData.payment_type} onValueChange={(v) => handleChange('payment_type', v)} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="avista" id="avista" />
              <Label htmlFor="avista">À vista <span className="text-destructive">*</span></Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="parcelado" id="parcelado" />
              <Label htmlFor="parcelado">Parcelado <span className="text-destructive">*</span></Label>
            </div>
          </RadioGroup>
          {formData.payment_type === 'parcelado' && (
            <div className="mt-4 max-w-xs">
              <Label>Número de parcelas</Label>
              <Input type="number" min="2" value={formData.installments} onChange={(e) => handleChange('installments', parseInt(e.target.value) || 1)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" />Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic mb-2">Esta observação será impressa no pedido</p>
            <Textarea value={formData.observations} onChange={(e) => handleChange('observations', e.target.value)} rows={4} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" />Observações internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic mb-2">Esta observação é de uso interno, não será impressa</p>
            <Textarea value={formData.internal_observations} onChange={(e) => handleChange('internal_observations', e.target.value)} rows={4} />
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={createSale.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Cadastrar
        </Button>
        <Button variant="destructive" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
