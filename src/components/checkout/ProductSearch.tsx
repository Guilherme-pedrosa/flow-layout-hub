import { useState } from "react";
import { Search, Plus, Barcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
}

// Mock products for demonstration
const mockProducts: Product[] = [
  { id: "1", code: "001", name: "Óleo de Motor 5W30 1L", price: 45.90, stock: 25, unit: "un" },
  { id: "2", code: "002", name: "Filtro de Óleo Universal", price: 32.50, stock: 18, unit: "un" },
  { id: "3", code: "003", name: "Pastilha de Freio Dianteira", price: 89.90, stock: 12, unit: "jg" },
  { id: "4", code: "004", name: "Lâmpada H7 12V 55W", price: 28.00, stock: 35, unit: "un" },
  { id: "5", code: "005", name: "Fluido de Freio DOT 4 500ml", price: 35.90, stock: 20, unit: "un" },
  { id: "6", code: "006", name: "Correia Dentada", price: 125.00, stock: 8, unit: "un" },
  { id: "7", code: "007", name: "Vela de Ignição NGK", price: 45.00, stock: 40, unit: "un" },
  { id: "8", code: "008", name: "Amortecedor Dianteiro", price: 289.90, stock: 6, unit: "un" },
];

interface ProductSearchProps {
  onAddProduct: (product: Product, quantity: number) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const filteredProducts = mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.includes(search)
  );

  const handleQuantityChange = (productId: string, value: string) => {
    const qty = parseInt(value) || 1;
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  };

  const handleAdd = (product: Product) => {
    const qty = quantities[product.id] || 1;
    onAddProduct(product, qty);
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" title="Leitor de código de barras">
            <Barcode className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin space-y-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{product.code}
                  </span>
                  <Badge 
                    variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {product.stock} {product.unit}
                  </Badge>
                </div>
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-lg font-bold text-primary">
                  R$ {product.price.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={product.stock}
                  value={quantities[product.id] || 1}
                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                  className="w-16 text-center"
                />
                <Button
                  size="icon"
                  onClick={() => handleAdd(product)}
                  disabled={product.stock === 0}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum produto encontrado</p>
              <p className="text-sm">Tente buscar por outro termo</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
