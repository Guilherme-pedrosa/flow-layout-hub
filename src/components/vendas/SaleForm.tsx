import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, DollarSign, FileText } from "lucide-react";
import { SaleFormDadosGerais } from "./SaleFormDadosGerais";
import { SaleFormProdutos } from "./SaleFormProdutos";
import { SaleFormServicos } from "./SaleFormServicos";
import { SaleFormTransporte } from "./SaleFormTransporte";
import { SaleFormPagamento, Installment } from "./SaleFormPagamento";
import { SaleFormAnexos, SaleAttachment } from "./SaleFormAnexos";
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
    seller_id: '',
    technician_id: '',
    status_id: initialData?.status_id ?? '',
    sale_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    sales_channel: 'presencial',
    cost_center_id: '',
    quote_number: '',
    os_number: '',
    os_gc: '',
    extra_observation: '',
    freight_value: '',
    carrier: '',
    show_delivery_address: false,
    delivery_address: {},
    discount_value: '',
    discount_percent: '',
    payment_type: 'avista',
    installments: '',
    observations: '',
    internal_observations: '',
  });

  const [productItems, setProductItems] = useState<SaleProductItem[]>([]);
  const [serviceItems, setServiceItems] = useState<SaleServiceItem[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [attachments, setAttachments] = useState<SaleAttachment[]>([]);

  const freightValue = parseFloat(formData.freight_value) || 0;
  const discountValue = parseFloat(formData.discount_value) || 0;
  const discountPercent = parseFloat(formData.discount_percent) || 0;
  const installmentsCount = parseInt(formData.installments) || 2;

  const productsTotal = productItems.reduce((sum, i) => sum + i.subtotal, 0);
  const servicesTotal = serviceItems.reduce((sum, i) => sum + i.subtotal, 0);
  const subtotal = productsTotal + servicesTotal + freightValue;
  const discountAmount = discountPercent > 0 
    ? subtotal * (discountPercent / 100) 
    : discountValue;
  const total = subtotal - discountAmount;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const sale = {
      company_id: '7875af52-18d0-434e-8ae9-97981bd668e7', // TODO: pegar da empresa do usuário logado
      client_id: formData.client_id || null,
      seller_id: formData.seller_id || null,
      technician_id: formData.technician_id || null,
      status_id: formData.status_id || null,
      sale_date: formData.sale_date,
      delivery_date: formData.delivery_date || null,
      sales_channel: formData.sales_channel,
      cost_center_id: formData.cost_center_id || null,
      quote_number: formData.quote_number || null,
      os_number: formData.os_number || null,
      os_gc: formData.os_gc || null,
      extra_observation: formData.extra_observation || null,
      freight_value: freightValue,
      carrier: formData.carrier || null,
      delivery_address: formData.show_delivery_address ? formData.delivery_address : null,
      products_total: productsTotal,
      services_total: servicesTotal,
      discount_value: discountValue,
      discount_percent: discountPercent,
      total_value: total,
      payment_type: formData.payment_type,
      installments: formData.payment_type === 'parcelado' ? installmentsCount : 1,
      observations: formData.observations || null,
      internal_observations: formData.internal_observations || null,
    };

    await createSale.mutateAsync({
      sale,
      productItems: productItems.map(({ product, ...item }) => item),
      serviceItems: serviceItems.map(({ service, ...item }) => item),
      installments: formData.payment_type === 'parcelado' ? installments : [],
      attachments,
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Produtos</Label>
              <Input value={formatCurrency(productsTotal)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Serviços</Label>
              <Input value={formatCurrency(servicesTotal)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Frete (R$)</Label>
              <Input 
                type="text"
                inputMode="decimal"
                value={formData.freight_value} 
                onChange={(e) => handleChange('freight_value', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input 
                type="text"
                inputMode="decimal"
                value={formData.discount_value} 
                onChange={(e) => handleChange('discount_value', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input 
                type="text"
                inputMode="decimal"
                value={formData.discount_percent} 
                onChange={(e) => handleChange('discount_percent', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Valor total</Label>
              <Input value={formatCurrency(total)} disabled className="bg-muted font-bold" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <SaleFormPagamento
        paymentType={formData.payment_type}
        installmentsCount={installmentsCount}
        installments={installments}
        totalValue={total}
        onChange={handleChange}
        onInstallmentsChange={setInstallments}
      />

      {/* Anexos */}
      <SaleFormAnexos 
        attachments={attachments}
        onChange={setAttachments}
      />

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
