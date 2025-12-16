import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

  const variants = {
    primary: "bg-primary hover:bg-primary/90 text-white shadow-soft hover:shadow-lg transition-all duration-200 border border-transparent",
    secondary: "bg-secondary hover:bg-secondary/90 text-white shadow-soft hover:shadow-lg transition-all duration-200 border border-transparent",
    outline: "border border-white/10 bg-transparent hover:bg-white/5 text-text-primary",
    ghost: "text-text-muted hover:text-primary hover:bg-primary/5",
    danger: "bg-error text-white hover:bg-error/90 shadow-sm",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
