import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { ProductSearch, Cart, CartItemData, CheckoutSummary } from "@/components/checkout";
import { ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
}

export default function Checkout() {
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);

  const handleAddProduct = (product: Product, quantity: number) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: product.id,
          code: product.code,
          name: product.name,
          price: product.price,
          quantity,
          unit: product.unit,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleFinalize = () => {
    setCartItems([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Checkout"
        description="Finalize vendas e baixe estoque automaticamente"
        breadcrumbs={[{ label: "Operação" }, { label: "Checkout" }]}
        actions={
          cartItems.length > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-medium">{cartItems.length} itens</span>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 min-h-0">
        {/* Busca de produtos - lado esquerdo */}
        <div className="lg:col-span-5 min-h-[400px] lg:min-h-0">
          <ProductSearch onAddProduct={handleAddProduct} />
        </div>

        {/* Carrinho - centro */}
        <div className="lg:col-span-4 min-h-[300px] lg:min-h-0">
          <Cart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
            onClear={handleClearCart}
          />
        </div>

        {/* Resumo e pagamento - lado direito */}
        <div className="lg:col-span-3 min-h-[350px] lg:min-h-0">
          <CheckoutSummary items={cartItems} onFinalize={handleFinalize} />
        </div>
      </div>
    </div>
  );
}
