import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium text-text-muted">{label}</label>}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary file:border-0 file:bg-primary file:text-white file:text-sm file:font-medium file:mr-3 file:px-3 file:py-1 file:rounded-md placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
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
