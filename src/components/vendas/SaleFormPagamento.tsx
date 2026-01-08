import { useEffect, useState } from "react";
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

// Componente para input de valor monetário - SEM valor default, totalmente editável
function CurrencyInput({ 
  value, 
  onChange 
}: { 
  value: number | null; 
  onChange: (value: number | null) => void;
}) {
  // Estado local para controle total - valor pode ser null
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Atualizar input quando valor externo mudar (apenas se não estiver focado)
  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === 0) {
        setInputValue('');
      } else {
        setInputValue(value.toFixed(2).replace('.', ','));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Permite campo completamente vazio
    if (val === '') {
      setInputValue('');
      onChange(null); // Retorna null, não 0
      return;
    }
    
    // Permite apenas números, vírgula e ponto
    if (/^[\d.,]*$/.test(val)) {
      setInputValue(val);
      const numericValue = parseFloat(val.replace(',', '.'));
      onChange(isNaN(numericValue) ? null : numericValue);
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="0,00"
        className="pl-9 min-w-[140px] text-right font-mono text-base"
      />
    </div>
  );
}

export function SaleFormPagamento({ 
  paymentType, 
  installmentsCount, 
  installments, 
  totalValue,
  onChange, 
  onInstallmentsChange 
}: SaleFormPagamentoProps) {

  // Gerar parcelas quando mudar o número de parcelas - SEM valor default
  useEffect(() => {
    if (paymentType === 'parcelado' && installmentsCount >= 2) {
      const today = new Date();
      
      const newInstallments: Installment[] = [];
      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        newInstallments.push({
          installment_number: i,
          due_date: dueDate.toISOString().split('T')[0],
          amount: 0, // Começa zerado - usuário preenche
          payment_method: 'boleto'
        });
      }
      
      onInstallmentsChange(newInstallments);
    }
  }, [paymentType, installmentsCount]); // Removido totalValue - NÃO recalcula automaticamente

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
                <div className="space-y-3">
                  {installments.map((inst, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">
                          Parcela {inst.installment_number}/{installmentsCount}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Vencimento</Label>
                          <Input
                            type="date"
                            value={inst.due_date}
                            onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                          <CurrencyInput
                            value={inst.amount}
                            onChange={(value) => updateInstallment(index, 'amount', value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                          <Select
                            value={inst.payment_method}
                            onValueChange={(value) => updateInstallment(index, 'payment_method', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map(pm => (
                                <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const filledInstallments = installments.filter(i => i.amount > 0);
                  const emptyCount = installments.length - filledInstallments.length;
                  const total = filledInstallments.reduce((sum, i) => sum + i.amount, 0);
                  
                  return (
                    <div className="flex flex-col items-end gap-1">
                      {emptyCount > 0 && (
                        <span className="text-xs text-amber-600">
                          ⚠️ {emptyCount} parcela(s) sem valor
                        </span>
                      )}
                      <span className="text-sm font-medium">
                        Total das parcelas: {formatCurrency(total)}
                      </span>
                    </div>
                  );
                })()}
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
