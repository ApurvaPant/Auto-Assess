import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-semibold text-text-secondary">{label}</label>}
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-overlay/15 bg-overlay/[0.03] px-4 py-2 text-sm text-text-primary file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-semibold file:mr-3 file:px-4 file:py-1 file:rounded-md placeholder:text-text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-overlay/20 focus-visible:border-overlay/25 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200",
          error && "border-error focus-visible:ring-error",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";

export { Input };
