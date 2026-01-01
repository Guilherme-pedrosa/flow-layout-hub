import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, min, max, className, disabled, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(value?.toString() ?? '');
    const [isFocused, setIsFocused] = React.useState(false);
    
    // Sync display value when external value changes (but not when user is typing)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value?.toString() ?? '');
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input for editing
      if (inputValue === '' || inputValue === '-') {
        setDisplayValue(inputValue);
        return;
      }

      // Validate numeric input (positive numbers only for currency)
      const regex = /^\d*\.?\d*$/;
      if (!regex.test(inputValue)) {
        return;
      }

      setDisplayValue(inputValue);
      
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        let constrainedValue = numValue;
        if (min !== undefined && numValue < min) constrainedValue = min;
        if (max !== undefined && numValue > max) constrainedValue = max;
        
        onChange(constrainedValue);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      const numValue = parseFloat(displayValue);
      if (isNaN(numValue) || displayValue === '' || displayValue === '-') {
        setDisplayValue('0');
        onChange(0);
      } else {
        let finalValue = numValue;
        if (min !== undefined && numValue < min) finalValue = min;
        if (max !== undefined && numValue > max) finalValue = max;
        
        finalValue = parseFloat(finalValue.toFixed(2));
        
        setDisplayValue(finalValue.toString());
        onChange(finalValue);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    return (
      <div className={cn("relative flex items-center", disabled && "opacity-50")}>
        <span className="absolute left-3 text-muted-foreground text-sm pointer-events-none">
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
          className={cn("pl-9", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
