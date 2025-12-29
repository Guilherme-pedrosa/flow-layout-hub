import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  allowNegative?: boolean;
  decimalPlaces?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, min = 0, max, step = 1, allowNegative = false, decimalPlaces, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(value?.toString() ?? '0');
    
    // Sync display value when external value changes (but not from user typing)
    React.useEffect(() => {
      // Only update if the parsed display value doesn't match the external value
      const parsedDisplay = parseFloat(displayValue);
      if (isNaN(parsedDisplay) && value === 0) return;
      if (parsedDisplay !== value) {
        setDisplayValue(value?.toString() ?? '0');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input for editing
      if (inputValue === '' || inputValue === '-') {
        setDisplayValue(inputValue);
        return;
      }

      // Validate numeric input
      const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
      if (!regex.test(inputValue)) {
        return;
      }

      setDisplayValue(inputValue);
      
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        // Apply constraints
        let constrainedValue = numValue;
        if (min !== undefined && numValue < min) constrainedValue = min;
        if (max !== undefined && numValue > max) constrainedValue = max;
        
        onChange(constrainedValue);
      }
    };

    const handleBlur = () => {
      // On blur, ensure we have a valid numeric value
      const numValue = parseFloat(displayValue);
      if (isNaN(numValue) || displayValue === '' || displayValue === '-') {
        setDisplayValue(min?.toString() ?? '0');
        onChange(min ?? 0);
      } else {
        // Apply constraints and format
        let finalValue = numValue;
        if (min !== undefined && numValue < min) finalValue = min;
        if (max !== undefined && numValue > max) finalValue = max;
        
        if (decimalPlaces !== undefined) {
          finalValue = parseFloat(finalValue.toFixed(decimalPlaces));
        }
        
        setDisplayValue(finalValue.toString());
        onChange(finalValue);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
