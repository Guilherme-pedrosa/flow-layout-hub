import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseBRNumber, formatForInput } from "@/lib/brMoney";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  decimals?: 2 | 4;
  allowEmpty?: boolean;
}

/**
 * Input monetário no padrão BR
 * - Aceita vírgula como decimal (96,70)
 * - Aceita ponto como milhar (1.234,56)
 * - Permite apagar e deixar vazio
 * - NÃO reescreve enquanto usuário digita
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, min, max, decimals = 2, allowEmpty = true, className, disabled, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(() => 
      formatForInput(value, decimals)
    );
    const [isFocused, setIsFocused] = React.useState(false);
    
    // Sync display value when external value changes (but NEVER when user is typing)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatForInput(value, decimals));
      }
    }, [value, isFocused, decimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Sempre permitir edição livre - usuário manda
      setDisplayValue(inputValue);
      
      // Se vazio, reportar null (se allowEmpty) ou manter
      if (inputValue.trim() === '') {
        if (allowEmpty) {
          onChange(null);
        }
        return;
      }

      // Parse usando o módulo BR
      const numValue = parseBRNumber(inputValue);
      
      if (numValue !== null) {
        let constrainedValue = numValue;
        if (min !== undefined && numValue < min) constrainedValue = min;
        if (max !== undefined && numValue > max) constrainedValue = max;
        onChange(constrainedValue);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      
      const numValue = parseBRNumber(displayValue);
      
      if (numValue === null) {
        if (allowEmpty) {
          setDisplayValue('');
          onChange(null);
        } else {
          setDisplayValue('0,00');
          onChange(0);
        }
        return;
      }

      let finalValue = numValue;
      if (min !== undefined && numValue < min) finalValue = min;
      if (max !== undefined && numValue > max) finalValue = max;
      
      // Formatar para exibição no blur
      setDisplayValue(formatForInput(finalValue, decimals));
      onChange(finalValue);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    return (
      <div className={cn("relative flex items-center", disabled && "opacity-50")}>
        <span className="absolute left-3 text-muted-foreground text-sm pointer-events-none select-none">
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          className={cn("pl-9 min-w-[140px] text-right", className)}
          placeholder="0,00"
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
