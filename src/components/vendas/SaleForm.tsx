import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Save, X, DollarSign, FileText, Printer, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { SaleFormDadosGerais } from "./SaleFormDadosGerais";
import { SaleFormProdutos } from "./SaleFormProdutos";
import { SaleFormServicos } from "./SaleFormServicos";
import { SaleFormTransporte } from "./SaleFormTransporte";
import { SaleFormPagamento, Installment } from "./SaleFormPagamento";
import { SaleFormAnexos, SaleAttachment } from "./SaleFormAnexos";
import { useSales, Sale, SaleProductItem, SaleServiceItem } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuditValidationBadge } from "@/components/shared/AuditValidationBadge";
import { useAiAuditora, AuditResult } from "@/hooks/useAiAuditora";

interface SaleFormProps {
  onClose: () => void;
  initialData?: Sale | null;
}

const TEMP_COMPANY_ID = "7875af52-18d0-434e-8ae9-97981bd668e7";

export function SaleForm({ onClose, initialData }: SaleFormProps) {
  const { createSale, updateSale } = useSales();
  const navigate = useNavigate();
  const { printDocument, printSummary, isGenerating } = useDocumentPdf();
  const { auditSale, loading: auditLoading } = useAiAuditora();
  const isEditing = !!initialData?.id;
  
  const [formData, setFormData] = useState({
    client_id: '',
    seller_id: '',
    technician_id: '',
    status_id: '',
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
    delivery_address: {} as Record<string, any>,
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
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  // Executar auditoria quando dados mudam
  useEffect(() => {
    const runAudit = async () => {
      const freightVal = parseFloat(formData.freight_value) || 0;
      const discountPct = parseFloat(formData.discount_percent) || 0;
      const discountVal = parseFloat(formData.discount_value) || 0;
      const productsSum = productItems.reduce((sum, i) => sum + i.subtotal, 0);
      const servicesSum = serviceItems.reduce((sum, i) => sum + i.subtotal, 0);
      const subtotal = productsSum + servicesSum + freightVal;
      const discountAmount = discountPct > 0 ? subtotal * discountPct / 100 : discountVal;
      const totalVal = subtotal - discountAmount;
      
      const result = await auditSale({
        products_total: productsSum,
        services_total: servicesSum,
        freight_value: freightVal,
        discount_value: discountVal,
        discount_percent: discountPct,
        total_value: totalVal,
        client_id: formData.client_id || undefined,
        payment_type: formData.payment_type,
      });
      setAuditResult(result);
    };
    
    const timeout = setTimeout(runAudit, 500);
    return () => clearTimeout(timeout);
  }, [productItems, serviceItems, formData.discount_percent, formData.discount_value, formData.freight_value, formData.client_id, formData.payment_type]);

  // Load data when editing
  useEffect(() => {
    if (initialData?.id) {
      loadSaleData(initialData.id);
    }
  }, [initialData?.id]);

  const loadSaleData = async (saleId: string) => {
    setLoading(true);
    try {
      // Load sale details
      const { data: sale } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();

      if (sale) {
        setFormData({
          client_id: sale.client_id || '',
          seller_id: sale.seller_id || '',
          technician_id: sale.technician_id || '',
          status_id: sale.status_id || '',
          sale_date: sale.sale_date || new Date().toISOString().split('T')[0],
          delivery_date: sale.delivery_date || '',
          sales_channel: sale.sales_channel || 'presencial',
          cost_center_id: sale.cost_center_id || '',
          quote_number: sale.quote_number || '',
          os_number: sale.os_number || '',
          os_gc: sale.os_gc || '',
          extra_observation: sale.extra_observation || '',
          freight_value: sale.freight_value?.toString() || '',
          carrier: sale.carrier || '',
          show_delivery_address: !!sale.delivery_address,
          delivery_address: (sale.delivery_address as Record<string, any>) || {},
          discount_value: sale.discount_value?.toString() || '',
          discount_percent: sale.discount_percent?.toString() || '',
          payment_type: sale.payment_type || 'avista',
          installments: sale.installments?.toString() || '',
          observations: sale.observations || '',
          internal_observations: sale.internal_observations || '',
        });
      }

      // Load product items
      const { data: products } = await supabase
        .from("sale_product_items")
        .select("*, product:products(id, code, description, quantity, sale_price, unit, barcode)")
        .eq("sale_id", saleId);

      if (products) {
        setProductItems(products.map((p: any) => ({
          id: p.id,
          sale_id: p.sale_id,
          product_id: p.product_id,
          product: p.product,
          details: p.details || '',
          quantity: p.quantity,
          unit_price: p.unit_price,
          discount_value: p.discount_value || 0,
          discount_type: p.discount_type || 'value',
          subtotal: p.subtotal,
          price_table_id: p.price_table_id,
        })));
      }

      // Load service items
      const { data: services } = await supabase
        .from("sale_service_items")
        .select("*, service:services(id, code, description, unit, sale_price)")
        .eq("sale_id", saleId);

      if (services) {
        setServiceItems(services.map((s: any) => ({
          id: s.id,
          sale_id: s.sale_id,
          service_id: s.service_id,
          service: s.service,
          service_description: s.service_description,
          details: s.details || '',
          quantity: s.quantity,
          unit_price: s.unit_price,
          discount_value: s.discount_value || 0,
          discount_type: s.discount_type || 'value',
          subtotal: s.subtotal,
        })));
      }

      // Load attachments
      const { data: atts } = await supabase
        .from("sale_attachments")
        .select("*")
        .eq("sale_id", saleId);

      if (atts) {
        setAttachments(atts.map((a: any) => ({
          id: a.id,
          file_name: a.file_name,
          file_url: a.file_url,
          file_size: a.file_size,
        })));
      }

      // Load installments
      const { data: insts } = await supabase
        .from("sale_installments")
        .select("*")
        .eq("sale_id", saleId)
        .order("installment_number");

      if (insts && insts.length > 0) {
        setInstallments(insts.map((i: any) => ({
          installment_number: i.installment_number,
          due_date: i.due_date,
          amount: i.amount,
          payment_method: i.payment_method || 'boleto',
        })));
      }

    } catch (error) {
      console.error("Erro ao carregar venda:", error);
      toast.error("Erro ao carregar dados da venda");
    } finally {
      setLoading(false);
    }
  };

  const freightValue = parseFloat(formData.freight_value) || 0;
  const discountValue = parseFloat(formData.discount_value) || 0;
  const discountPercent = parseFloat(formData.discount_percent) || 0;
  const installmentsCount = formData.installments === '' ? 0 : (parseInt(formData.installments) || 0);

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

  const logAudit = async (saleId: string, action: string, metadata: Record<string, any>) => {
    try {
      await supabase.from("audit_logs").insert({
        company_id: TEMP_COMPANY_ID,
        entity: "sales",
        entity_id: saleId,
        action,
        metadata_json: metadata,
      });
    } catch (error) {
      console.error("Erro ao registrar auditoria:", error);
    }
  };

  const handleSave = async () => {
    // Bloquear se auditoria tiver erro crítico
    if (auditResult?.riskLevel === 'critical') {
      toast.error('Venda bloqueada: corrija os erros críticos antes de salvar');
      return;
    }

    // Alertar se tiver risco alto
    if (auditResult?.riskLevel === 'high') {
      toast.warning('Atenção: Esta venda possui alertas importantes. Verifique antes de continuar.');
    }

    const saleData = {
      company_id: TEMP_COMPANY_ID,
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

    try {
      if (isEditing && initialData?.id) {
        // Update existing sale
        await updateSale.mutateAsync({ id: initialData.id, sale: saleData });

        // Delete and re-insert items
        await supabase.from("sale_product_items").delete().eq("sale_id", initialData.id);
        await supabase.from("sale_service_items").delete().eq("sale_id", initialData.id);
        await supabase.from("sale_installments").delete().eq("sale_id", initialData.id);
        await supabase.from("sale_attachments").delete().eq("sale_id", initialData.id);

        if (productItems.length > 0) {
          await supabase.from("sale_product_items").insert(
            productItems.map(({ product, id, sale_id, ...item }) => ({ 
              product_id: item.product_id || null,
              details: item.details || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_value: item.discount_value || 0,
              discount_type: item.discount_type || 'value',
              subtotal: item.subtotal,
              price_table_id: item.price_table_id || null,
              sale_id: initialData.id 
            }))
          );
        }

        if (serviceItems.length > 0) {
          await supabase.from("sale_service_items").insert(
            serviceItems.map(({ service, id, sale_id, ...item }) => ({ 
              service_id: item.service_id || null,
              service_description: item.service_description,
              details: item.details || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_value: item.discount_value || 0,
              discount_type: item.discount_type || 'value',
              subtotal: item.subtotal,
              sale_id: initialData.id 
            }))
          );
        }

        if (formData.payment_type === 'parcelado' && installments.length > 0) {
          await supabase.from("sale_installments").insert(
            installments.map(item => ({ ...item, sale_id: initialData.id }))
          );
        }

        if (attachments.length > 0) {
          await supabase.from("sale_attachments").insert(
            attachments.map(({ id, ...item }) => ({ 
              file_name: item.file_name,
              file_url: item.file_url,
              file_size: item.file_size || null,
              sale_id: initialData.id 
            }))
          );
        }

        // Log audit
        await logAudit(initialData.id, "update", {
          updated_fields: Object.keys(saleData),
          products_count: productItems.length,
          services_count: serviceItems.length,
        });

        toast.success("Venda atualizada com sucesso!");
      } else {
        // Create new sale
        const result = await createSale.mutateAsync({
          sale: saleData,
          productItems: productItems.map(({ product, id, sale_id, ...item }) => ({
            product_id: item.product_id || null,
            details: item.details || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_value: item.discount_value || 0,
            discount_type: item.discount_type || 'value',
            subtotal: item.subtotal,
            price_table_id: item.price_table_id || null,
          })),
          serviceItems: serviceItems.map(({ service, id, sale_id, ...item }) => ({
            service_id: item.service_id || null,
            service_description: item.service_description,
            details: item.details || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_value: item.discount_value || 0,
            discount_type: item.discount_type || 'value',
            subtotal: item.subtotal,
          })),
          installments: formData.payment_type === 'parcelado' ? installments : [],
          attachments: attachments.map(({ id, ...item }) => item),
        });

        // Log audit for creation
        if (result?.id) {
          await logAudit(result.id, "create", {
            products_count: productItems.length,
            services_count: serviceItems.length,
            total_value: total,
          });
        }
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando dados da venda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badge de Auditoria IA */}
      <AuditValidationBadge
        result={auditResult}
        loading={auditLoading}
      />

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
        <Button onClick={handleSave} disabled={createSale.isPending || updateSale.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
        </Button>
        {isEditing && initialData?.id && (
          <>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isGenerating}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => printDocument(initialData.id, "sale")}>
                <FileText className="h-4 w-4 mr-2" />Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => printSummary(initialData.id, "sale")}>
                <FileText className="h-4 w-4 mr-2" />Resumido
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              className="bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={() => navigate(`/notas-fiscais/adicionar?venda=${initialData.id}`)}
            >
              <Send className="h-4 w-4 mr-2" />
              Emitir NF-e
            </Button>
          </>
        )}
        <Button variant="destructive" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}