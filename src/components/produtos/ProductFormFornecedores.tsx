import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2 } from "lucide-react";

interface Supplier {
  id?: string;
  supplier_name: string;
  supplier_cnpj: string;
  supplier_code: string;
}

interface ProductFormFornecedoresProps {
  suppliers: Supplier[];
  onChange: (suppliers: Supplier[]) => void;
}

export function ProductFormFornecedores({ suppliers, onChange }: ProductFormFornecedoresProps) {
  const [newSupplier, setNewSupplier] = useState<Supplier>({
    supplier_name: '',
    supplier_cnpj: '',
    supplier_code: '',
  });

  const addSupplier = () => {
    if (!newSupplier.supplier_name) return;
    
    onChange([...suppliers, { ...newSupplier }]);
    setNewSupplier({
      supplier_name: '',
      supplier_cnpj: '',
      supplier_code: '',
    });
  };

  const removeSupplier = (index: number) => {
    onChange(suppliers.filter((_, i) => i !== index));
  };

  const updateSupplier = (index: number, field: keyof Supplier, value: string) => {
    const updated = [...suppliers];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-muted/50">
        <AlertDescription>
          Sugerimos que vincule um ou mais fornecedores a este produto, pois durante o cadastramento de 
          compras e cotações é exigido que você vincule o fornecedor ao cadastro. Caso exista produtos 
          vinculados a este fornecedor, o sistema irá importar automaticamente estes produtos facilitando o processo.
        </AlertDescription>
      </Alert>

      {/* Lista de fornecedores */}
      {suppliers.length > 0 && (
        <div className="space-y-3">
          {suppliers.map((supplier, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-sm">Nome do fornecedor</Label>
                    <Input
                      value={supplier.supplier_name}
                      onChange={(e) => updateSupplier(index, 'supplier_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">CNPJ</Label>
                    <Input
                      value={supplier.supplier_cnpj}
                      onChange={(e) => updateSupplier(index, 'supplier_cnpj', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Código no fornecedor</Label>
                    <Input
                      value={supplier.supplier_code}
                      onChange={(e) => updateSupplier(index, 'supplier_code', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSupplier(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Adicionar novo fornecedor */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm">Nome do fornecedor</Label>
              <Input
                value={newSupplier.supplier_name}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_name: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">CNPJ</Label>
              <Input
                value={newSupplier.supplier_cnpj}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Código no fornecedor</Label>
              <Input
                value={newSupplier.supplier_code}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_code: e.target.value })}
                placeholder="Código do produto no fornecedor"
              />
            </div>
            <Button
              type="button"
              onClick={addSupplier}
              disabled={!newSupplier.supplier_name}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar fornecedor
            </Button>
          </div>
        </CardContent>
      </Card>

      {suppliers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum fornecedor vinculado a este produto
        </div>
      )}
    </div>
  );
}
