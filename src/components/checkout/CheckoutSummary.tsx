import { useState } from "react";
import { CreditCard, Banknote, QrCode, Receipt, User, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CartItemData } from "./CartItem";

interface CheckoutSummaryProps {
  items: CartItemData[];
  onFinalize: () => void;
}

type PaymentMethod = "dinheiro" | "cartao" | "pix";

export function CheckoutSummary({ items, onFinalize }: CheckoutSummaryProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountValue = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountValue);

  const handleFinalize = () => {
    setShowSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onFinalize();
    setDiscount("");
    setCustomerName("");
    setPaymentMethod("dinheiro");
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 pt-0">
          <div className="space-y-4 flex-1">
            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="customer" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente (opcional)
              </Label>
              <Input
                id="customer"
                placeholder="Nome do cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Forma de pagamento */}
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="grid grid-cols-3 gap-2"
              >
                <div>
                  <RadioGroupItem
                    value="dinheiro"
                    id="dinheiro"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="dinheiro"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent/10 hover:text-accent-foreground peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 cursor-pointer transition-colors"
                  >
                    <Banknote className="h-5 w-5 mb-1" />
                    <span className="text-xs">Dinheiro</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="cartao"
                    id="cartao"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="cartao"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent/10 hover:text-accent-foreground peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 cursor-pointer transition-colors"
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-xs">Cartão</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="pix" id="pix" className="peer sr-only" />
                  <Label
                    htmlFor="pix"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent/10 hover:text-accent-foreground peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 cursor-pointer transition-colors"
                  >
                    <QrCode className="h-5 w-5 mb-1" />
                    <span className="text-xs">PIX</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Desconto */}
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (R$)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>

          {/* Totais */}
          <div className="mt-4 space-y-2">
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto</span>
                <span>- R$ {discountValue.toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>

          {/* Botão finalizar */}
          <Button
            size="lg"
            className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg h-14"
            disabled={items.length === 0}
            onClick={handleFinalize}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finalizar Venda
          </Button>
        </CardContent>
      </Card>

      {/* Modal de sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <DialogTitle className="text-center text-xl">
              Venda Finalizada!
            </DialogTitle>
            <DialogDescription className="text-center">
              Venda registrada com sucesso. O estoque foi baixado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Itens</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium capitalize">{paymentMethod}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-accent">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
          <Button onClick={handleCloseSuccess} className="w-full">
            Nova Venda
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
