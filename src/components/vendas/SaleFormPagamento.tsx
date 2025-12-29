import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export interface Installment {
  installment_number: number;
  due_date: string;
  amount: number;
  payment_method: string;
}

interface SaleFormPagamentoProps {
  paymentType: string;
  installmentsCount: number;
  installments: Installment[];
  totalValue: number;
  onChange: (field: string, value: any) => void;
  onInstallmentsChange: (installments: Installment[]) => void;
}

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque', label: 'Cheque' },
];

export function SaleFormPagamento({ 
  paymentType, 
  installmentsCount, 
  installments, 
  totalValue,
  onChange, 
  onInstallmentsChange 
}: SaleFormPagamentoProps) {

  // Gerar parcelas quando mudar o número de parcelas ou o valor total
  useEffect(() => {
    if (paymentType === 'parcelado' && installmentsCount >= 2) {
      const installmentValue = totalValue / installmentsCount;
      const today = new Date();
      
      const newInstallments: Installment[] = [];
      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        newInstallments.push({
          installment_number: i,
          due_date: dueDate.toISOString().split('T')[0],
          amount: installmentValue,
          payment_method: 'boleto'
        });
      }
      
      onInstallmentsChange(newInstallments);
    }
  }, [paymentType, installmentsCount, totalValue]);

  const updateInstallment = (index: number, field: keyof Installment, value: any) => {
    const newInstallments = [...installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    onInstallmentsChange(newInstallments);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={paymentType} 
          onValueChange={(v) => onChange('payment_type', v)} 
          className="flex gap-6 mb-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="avista" id="avista" />
            <Label htmlFor="avista">À vista <span className="text-destructive">*</span></Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parcelado" id="parcelado" />
            <Label htmlFor="parcelado">Parcelado <span className="text-destructive">*</span></Label>
          </div>
        </RadioGroup>

        {paymentType === 'parcelado' && (
          <div className="space-y-4">
            <div className="max-w-xs">
              <Label>Número de parcelas</Label>
              <Input 
                type="text"
                inputMode="numeric"
                placeholder="2"
                value={installmentsCount === 0 ? '' : installmentsCount.toString()} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*$/.test(val)) {
                    onChange('installments', val);
                  }
                }} 
              />
            </div>

            {installments.length > 0 && (
              <div className="mt-4">
                <Label className="mb-2 block">Detalhamento das parcelas</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Parcela</TableHead>
                      <TableHead className="w-[150px]">Vencimento</TableHead>
                      <TableHead className="w-[150px]">Valor</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map((inst, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {inst.installment_number}/{installmentsCount}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={inst.due_date}
                            onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={inst.amount === 0 ? '' : inst.amount.toString()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                updateInstallment(index, 'amount', val === '' ? 0 : parseFloat(val));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={inst.payment_method}
                            onValueChange={(value) => updateInstallment(index, 'payment_method', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map(pm => (
                                <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-2 text-right">
                  <span className="text-sm text-muted-foreground">
                    Total das parcelas: {formatCurrency(installments.reduce((sum, i) => sum + i.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {paymentType === 'avista' && (
          <div className="max-w-xs">
            <Label>Forma de pagamento</Label>
            <Select defaultValue="pix">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(pm => (
                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
