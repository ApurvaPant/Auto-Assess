import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-overlay/10 text-text-primary hover:bg-overlay/15 border border-overlay/10",
    outline: "border border-overlay/15 bg-transparent hover:bg-overlay/5 text-text-primary",
    ghost: "text-text-muted hover:text-text-primary hover:bg-overlay/5",
    danger: "bg-error text-white hover:bg-error/90",
  };

  const sizes = {
    icon: "h-9 w-9 p-0",
    sm: "h-8 px-3.5 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-6 text-sm",
    default: "h-10 px-4 text-sm",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size] || sizes.md,
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
