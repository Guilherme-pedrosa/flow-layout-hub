import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Save, X, Loader2 } from "lucide-react";
import { ProductFormDados } from "./ProductFormDados";
import { ProductFormDetalhes } from "./ProductFormDetalhes";
import { ProductFormValores } from "./ProductFormValores";
import { ProductFormEstoque } from "./ProductFormEstoque";
import { ProductFormFotos } from "./ProductFormFotos";
import { ProductFormFiscal } from "./ProductFormFiscal";
import { ProductFormFornecedores } from "./ProductFormFornecedores";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { AuditValidationBadge } from "@/components/shared/AuditValidationBadge";
import { useAiAuditora, AuditResult } from "@/hooks/useAiAuditora";

interface ProductImage {
  id?: string;
  url: string;
  is_main: boolean;
  display_order: number;
  file?: File;
}

interface Supplier {
  id?: string;
  supplier_name: string;
  supplier_cnpj: string;
  supplier_code: string;
}

interface UnitConversion {
  inputQty: number;
  inputUnit: string;
  outputQty: number;
  outputUnit: string;
}

interface ExtraField {
  name: string;
  value: string;
}

export interface ProductFormData {
  // Dados
  code: string;
  description: string;
  barcode: string;
  product_group: string;
  controls_stock: boolean;
  has_invoice: boolean;
  has_variations: boolean;
  has_composition: boolean;
  unit: string;
  unit_conversions: UnitConversion[];
  supplier_code: string; // Referência (código do fornecedor)
  
  // Detalhes
  weight: number;
  width: number;
  height: number;
  length: number;
  description_long: string;
  is_active: boolean;
  is_sold_separately: boolean;
  is_pdv_available: boolean;
  extra_fields: ExtraField[];
  
  // Valores
  purchase_price: number;
  accessory_expenses: number;
  other_expenses: number;
  final_cost: number;
  
  // Estoque
  min_stock: number;
  max_stock: number;
  quantity: number;
  
  // Fiscal
  ncm: string;
  ncm_validated: boolean;
  ncm_description: string;
  cest: string;
  origin: string;
  net_weight: number;
  gross_weight: number;
  fci_number: string;
  specific_product: string;
  benefit_code: string;
  icms_rate: number;
  
  // Images e fornecedores (manejados separadamente)
  images: ProductImage[];
  suppliers: Supplier[];
  
  // Flag para indicar se veio de XML
  isFromXml?: boolean;
}

const initialFormData: ProductFormData = {
  code: '',
  description: '',
  barcode: '',
  product_group: '',
  controls_stock: true,
  has_invoice: true,
  has_variations: false,
  has_composition: false,
  unit: 'UN',
  unit_conversions: [],
  supplier_code: '',
  weight: 0,
  width: 0,
  height: 0,
  length: 0,
  description_long: '',
  is_active: true,
  is_sold_separately: true,
  is_pdv_available: true,
  extra_fields: [],
  purchase_price: 0,
  accessory_expenses: 0,
  other_expenses: 0,
  final_cost: 0,
  min_stock: 0,
  max_stock: 0,
  quantity: 0,
  ncm: '',
  ncm_validated: false,
  ncm_description: '',
  cest: '',
  origin: '0',
  net_weight: 0,
  gross_weight: 0,
  fci_number: '',
  specific_product: 'nenhum',
  benefit_code: '',
  icms_rate: 0,
  images: [],
  suppliers: [],
  isFromXml: false,
};

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const tabs = [
  { id: 'dados', label: 'Dados' },
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'valores', label: 'Valores' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'fornecedores', label: 'Fornecedores' },
];

export function ProductForm({ initialData, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    ...initialFormData,
    ...initialData,
  });
  const [activeTab, setActiveTab] = useState('dados');
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  
  const { getNextCode, generateBarcode } = useProducts();
  const { auditProduct, loading: auditLoading } = useAiAuditora();

  // Executar auditoria quando dados mudam
  useEffect(() => {
    const runAudit = async () => {
      if (!formData.description) return;
      
      const result = await auditProduct({
        code: formData.code,
        description: formData.description,
        barcode: formData.barcode || undefined,
        ncm: formData.ncm || undefined,
        purchase_price: formData.purchase_price,
        sale_price: formData.final_cost * 1.3, // Estimativa de margem
        quantity: formData.quantity,
        min_stock: formData.min_stock,
        max_stock: formData.max_stock,
      });
      setAuditResult(result);
    };
    
    const timeout = setTimeout(runAudit, 500);
    return () => clearTimeout(timeout);
  }, [formData.code, formData.description, formData.barcode, formData.ncm, formData.purchase_price, formData.min_stock, formData.max_stock]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateCode = async () => {
    setIsCodeLoading(true);
    try {
      const code = await getNextCode();
      handleChange('code', code);
    } catch (error) {
      toast.error('Erro ao gerar código');
    } finally {
      setIsCodeLoading(false);
    }
  };

  const handleGenerateBarcode = async () => {
    setIsBarcodeLoading(true);
    try {
      const barcode = await generateBarcode();
      handleChange('barcode', barcode);
    } catch (error) {
      toast.error('Erro ao gerar código de barras');
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validações
    if (!formData.description) {
      toast.error('Nome do produto é obrigatório');
      setActiveTab('dados');
      return;
    }

    if (!formData.code) {
      toast.error('Código do produto é obrigatório');
      setActiveTab('dados');
      return;
    }

    if (!formData.ncm_validated && formData.ncm) {
      toast.error('Por favor, valide o NCM antes de salvar');
      setActiveTab('fiscal');
      return;
    }

    await onSubmit(formData);
  };

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  const canGoBack = currentTabIndex > 0;
  const canGoForward = currentTabIndex < tabs.length - 1;

  const goBack = () => {
    if (canGoBack) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Badge de Auditoria IA */}
      <AuditValidationBadge
        result={auditResult}
        loading={auditLoading}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <ProductFormDados
            formData={formData}
            onChange={handleChange}
            onGenerateCode={handleGenerateCode}
            onGenerateBarcode={handleGenerateBarcode}
            isCodeLoading={isCodeLoading}
            isBarcodeLoading={isBarcodeLoading}
          />
        </TabsContent>

        <TabsContent value="detalhes" className="mt-6">
          <ProductFormDetalhes
            formData={formData}
            onChange={handleChange}
          />
        </TabsContent>

        <TabsContent value="valores" className="mt-6">
          <ProductFormValores
            formData={formData}
            onChange={handleChange}
            isFromXml={formData.isFromXml}
          />
        </TabsContent>

        <TabsContent value="estoque" className="mt-6">
          <ProductFormEstoque
            formData={formData}
            onChange={handleChange}
          />
        </TabsContent>

        <TabsContent value="fotos" className="mt-6">
          <ProductFormFotos
            images={formData.images}
            onChange={(images) => handleChange('images', images)}
          />
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <ProductFormFiscal
            formData={formData}
            onChange={handleChange}
          />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-6">
          <ProductFormFornecedores
            suppliers={formData.suppliers}
            onChange={(suppliers) => handleChange('suppliers', suppliers)}
          />
        </TabsContent>
      </Tabs>

      {/* Navegação e ações */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={goForward}
            disabled={!canGoForward}
          >
            Continuar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="default"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Cadastrar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export { initialFormData };
