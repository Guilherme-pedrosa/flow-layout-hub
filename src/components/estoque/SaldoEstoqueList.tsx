import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export function SaldoEstoqueList() {
  const { products, isLoading } = useProducts();
  const [search, setSearch] = useState("");

  const filteredProducts = products
    .filter((p) => p.is_active)
    .filter(
      (p) =>
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por código ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque Mínimo</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-right">Valor Unitário</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isLowStock = (product.quantity ?? 0) <= (product.min_stock ?? 0);
                const totalValue = (product.quantity ?? 0) * (product.purchase_price ?? 0);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.code}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right">{product.min_stock ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <span className={isLowStock ? "text-destructive font-bold" : "font-medium"}>
                        {product.quantity ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.purchase_price ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Valor Total em Estoque</p>
          <p className="text-2xl font-bold">
            {formatCurrency(
              filteredProducts.reduce(
                (acc, p) => acc + (p.quantity ?? 0) * (p.purchase_price ?? 0),
                0
              )
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
