import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Save, X, DollarSign, FileText, Truck, Printer } from "lucide-react";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { ServiceOrderFormDadosGerais } from "./ServiceOrderFormDadosGerais";
import { ServiceOrderFormProdutos } from "./ServiceOrderFormProdutos";
import { ServiceOrderFormServicos } from "./ServiceOrderFormServicos";
import { ServiceOrderFormTecnico } from "./ServiceOrderFormTecnico";
import { SaleFormPagamento, Installment } from "@/components/vendas/SaleFormPagamento";
import { SaleFormAnexos, SaleAttachment } from "@/components/vendas/SaleFormAnexos";
import { SaleFormTransporte } from "@/components/vendas/SaleFormTransporte";
import { useServiceOrders, ServiceOrderProductItem, ServiceOrderServiceItem, ServiceOrder } from "@/hooks/useServiceOrders";
import { formatCurrency } from "@/lib/formatters";

interface ServiceOrderFormProps {
  onClose: () => void;
  initialData?: ServiceOrder | null;
}

export function ServiceOrderForm({ onClose, initialData }: ServiceOrderFormProps) {
  const { createOrder } = useServiceOrders();
  const { printDocument, printSummary, isGenerating } = useDocumentPdf();
  const isEditing = !!initialData?.id;
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id ?? '',
    seller_id: initialData?.seller_id ?? '',
    technician_id: initialData?.technician_id ?? '',
    status_id: initialData?.status_id ?? '',
    order_date: initialData?.order_date ?? new Date().toISOString().split('T')[0],
    delivery_date: initialData?.delivery_date ?? '',
    sales_channel: initialData?.sales_channel ?? 'presencial',
    cost_center_id: initialData?.cost_center_id ?? '',
    
    // Equipamento
    equipment_type: initialData?.equipment_type ?? '',
    equipment_brand: initialData?.equipment_brand ?? '',
    equipment_model: initialData?.equipment_model ?? '',
    equipment_serial: initialData?.equipment_serial ?? '',
    reported_issue: initialData?.reported_issue ?? '',
    
    // Técnico
    diagnosis: initialData?.diagnosis ?? '',
    solution: initialData?.solution ?? '',
    started_at: initialData?.started_at ?? '',
    finished_at: initialData?.finished_at ?? '',
    warranty_until: initialData?.warranty_until ?? '',
    labor_cost: '',
    parts_cost: '',
    external_service_cost: '',
    
    // Transporte
    freight_value: '',
    carrier: initialData?.carrier ?? '',
    show_delivery_address: false,
    delivery_address: initialData?.delivery_address ?? {},
    
    // Pagamento
    discount_value: '',
    discount_percent: '',
    payment_type: initialData?.payment_type ?? 'avista',
    installments: '',
    observations: initialData?.observations ?? '',
    internal_observations: initialData?.internal_observations ?? '',
  });

  const [productItems, setProductItems] = useState<ServiceOrderProductItem[]>(initialData?.product_items ?? []);
  const [serviceItems, setServiceItems] = useState<ServiceOrderServiceItem[]>(initialData?.service_items ?? []);
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

  // Custos calculados
  const calculatedPartsCost = productItems.reduce((sum, i) => sum + (i.purchase_price * i.quantity), 0);
  const calculatedLaborCost = serviceItems.reduce((sum, i) => sum + (i.cost_price * i.quantity), 0);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const laborCost = parseFloat(formData.labor_cost) || calculatedLaborCost;
    const partsCost = parseFloat(formData.parts_cost) || calculatedPartsCost;
    const externalCost = parseFloat(formData.external_service_cost) || 0;

    const order = {
      company_id: '7875af52-18d0-434e-8ae9-97981bd668e7',
      client_id: formData.client_id || null,
      seller_id: formData.seller_id || null,
      technician_id: formData.technician_id || null,
      status_id: formData.status_id || null,
      order_date: formData.order_date,
      delivery_date: formData.delivery_date || null,
      sales_channel: formData.sales_channel,
      cost_center_id: formData.cost_center_id || null,
      
      // Equipamento
      equipment_type: formData.equipment_type || null,
      equipment_brand: formData.equipment_brand || null,
      equipment_model: formData.equipment_model || null,
      equipment_serial: formData.equipment_serial || null,
      reported_issue: formData.reported_issue || null,
      
      // Técnico
      diagnosis: formData.diagnosis || null,
      solution: formData.solution || null,
      started_at: formData.started_at || null,
      finished_at: formData.finished_at || null,
      warranty_until: formData.warranty_until || null,
      
      // Custos
      labor_cost: laborCost,
      parts_cost: partsCost,
      external_service_cost: externalCost,
      total_cost: laborCost + partsCost + externalCost,
      
      // Valores
      freight_value: freightValue,
      carrier: formData.carrier || null,
      delivery_address: formData.show_delivery_address ? formData.delivery_address : null,
      products_total: productsTotal,
      services_total: servicesTotal,
      discount_value: discountValue,
      discount_percent: discountPercent,
      total_value: total,
      
      // Pagamento
      payment_type: formData.payment_type,
      installments: formData.payment_type === 'parcelado' ? installmentsCount : 1,
      observations: formData.observations || null,
      internal_observations: formData.internal_observations || null,
    };

    await createOrder.mutateAsync({
      order,
      productItems: productItems.map(({ product, ...item }) => item),
      serviceItems: serviceItems.map(({ service, ...item }) => item),
      installments: formData.payment_type === 'parcelado' ? installments : [],
      attachments,
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      <ServiceOrderFormDadosGerais formData={formData} onChange={handleChange} />
      <ServiceOrderFormProdutos items={productItems} onChange={setProductItems} />
      <ServiceOrderFormServicos items={serviceItems} onChange={setServiceItems} />
      <ServiceOrderFormTecnico 
        formData={formData} 
        onChange={handleChange}
        calculatedPartsCost={calculatedPartsCost}
        calculatedLaborCost={calculatedLaborCost}
      />

      {/* Transporte */}
      <SaleFormTransporte formData={{
        freight_value: formData.freight_value,
        carrier: formData.carrier,
        show_delivery_address: formData.show_delivery_address,
        delivery_address: typeof formData.delivery_address === 'object' && formData.delivery_address !== null 
          ? formData.delivery_address as any 
          : {}
      }} onChange={handleChange} />

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
            <p className="text-sm text-muted-foreground italic mb-2">Esta observação será impressa na OS</p>
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
        <Button onClick={handleSave} disabled={createOrder.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
        </Button>
        {isEditing && initialData?.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isGenerating}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => printDocument(initialData.id, "service_order")}>
                <FileText className="h-4 w-4 mr-2" />Relatório Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => printSummary(initialData.id, "service_order")}>
                <FileText className="h-4 w-4 mr-2" />Resumido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="destructive" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
