import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Star, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Supplier {
  id?: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_cnpj: string;
  supplier_code: string;
  last_purchase_price?: number;
  last_purchase_date?: string;
  is_preferred?: boolean;
  lead_time_days?: number;
  min_order_qty?: number;
}

interface PessoaFornecedor {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
}

interface ProductFormFornecedoresProps {
  suppliers: Supplier[];
  onChange: (suppliers: Supplier[]) => void;
  productId?: string;
}

export function ProductFormFornecedores({ suppliers, onChange, productId }: ProductFormFornecedoresProps) {
  const { currentCompany } = useCompany();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fornecedores, setFornecedores] = useState<PessoaFornecedor[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar fornecedores cadastrados
  useEffect(() => {
    const loadFornecedores = async () => {
      if (!currentCompany?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pessoas')
          .select('id, razao_social, nome_fantasia, cpf_cnpj')
          .eq('company_id', currentCompany.id)
          .eq('is_fornecedor', true)
          .eq('is_active', true)
          .order('razao_social');

        if (error) throw error;
        setFornecedores(data || []);
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFornecedores();
  }, [currentCompany?.id]);

  const addSupplier = (fornecedor: PessoaFornecedor) => {
    // Verificar se já está na lista
    if (suppliers.some(s => s.supplier_id === fornecedor.id)) {
      toast.error('Fornecedor já vinculado a este produto');
      return;
    }

    const newSupplier: Supplier = {
      supplier_id: fornecedor.id,
      supplier_name: fornecedor.razao_social || fornecedor.nome_fantasia || '',
      supplier_cnpj: fornecedor.cpf_cnpj || '',
      supplier_code: '',
      last_purchase_price: 0,
      is_preferred: suppliers.length === 0, // Primeiro é preferido por padrão
      lead_time_days: 0,
      min_order_qty: 1,
    };

    onChange([...suppliers, newSupplier]);
    setSearchOpen(false);
    setSearchTerm('');
  };

  const removeSupplier = (index: number) => {
    onChange(suppliers.filter((_, i) => i !== index));
  };

  const updateSupplier = (index: number, field: keyof Supplier, value: any) => {
    const updated = [...suppliers];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const setPreferred = (index: number) => {
    const updated = suppliers.map((s, i) => ({
      ...s,
      is_preferred: i === index,
    }));
    onChange(updated);
  };

  const filteredFornecedores = fornecedores.filter(f => {
    const search = searchTerm.toLowerCase();
    return (
      (f.razao_social?.toLowerCase().includes(search)) ||
      (f.nome_fantasia?.toLowerCase().includes(search)) ||
      (f.cpf_cnpj?.includes(search))
    );
  });

  return (
    <div className="space-y-6">
      <Alert className="bg-muted/50">
        <AlertDescription>
          Vincule fornecedores a este produto para facilitar cotações e compras. 
          O sistema usará esses dados para sugerir fornecedores e comparar preços automaticamente.
        </AlertDescription>
      </Alert>

      {/* Buscar e adicionar fornecedor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar Fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Carregando...' : 'Buscar fornecedor cadastrado'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Buscar por nome ou CNPJ..." 
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>
                    Nenhum fornecedor encontrado.
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre fornecedores em Cadastros → Fornecedores
                    </p>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredFornecedores.map((f) => (
                      <CommandItem
                        key={f.id}
                        value={f.id}
                        onSelect={() => addSupplier(f)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {f.razao_social || f.nome_fantasia}
                          </span>
                          {f.cpf_cnpj && (
                            <span className="text-xs text-muted-foreground">
                              {f.cpf_cnpj}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Lista de fornecedores vinculados */}
      {suppliers.length > 0 ? (
        <div className="space-y-3">
          {suppliers.map((supplier, index) => (
            <Card key={index} className={supplier.is_preferred ? 'border-primary' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{supplier.supplier_name}</span>
                    {supplier.supplier_cnpj && (
                      <span className="text-sm text-muted-foreground">
                        ({supplier.supplier_cnpj})
                      </span>
                    )}
                    {supplier.is_preferred && (
                      <Badge variant="default" className="ml-2">
                        <Star className="h-3 w-3 mr-1" />
                        Preferido
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!supplier.is_preferred && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreferred(index)}
                        title="Definir como fornecedor preferido"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSupplier(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Código no fornecedor</Label>
                    <Input
                      value={supplier.supplier_code}
                      onChange={(e) => updateSupplier(index, 'supplier_code', e.target.value)}
                      placeholder="SKU do fornecedor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Último preço de compra</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={supplier.last_purchase_price || ''}
                      onChange={(e) => updateSupplier(index, 'last_purchase_price', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Prazo entrega (dias)</Label>
                    <Input
                      type="number"
                      value={supplier.lead_time_days || ''}
                      onChange={(e) => updateSupplier(index, 'lead_time_days', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Qtd mínima pedido</Label>
                    <Input
                      type="number"
                      value={supplier.min_order_qty || ''}
                      onChange={(e) => updateSupplier(index, 'min_order_qty', parseFloat(e.target.value) || 1)}
                      placeholder="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum fornecedor vinculado a este produto
        </div>
      )}
    </div>
  );
}