import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-white px-4 py-3 text-body text-foreground",
          "placeholder:text-muted-foreground",
          "transition-colors duration-150",
          "focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
