import React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-white hover:bg-secondary/80",
  outline: "text-text-primary",
  success: "border-transparent bg-success/20 text-success hover:bg-success/30",
  warning: "border-transparent bg-warning/20 text-warning hover:bg-warning/30",
  error: "border-transparent bg-error/20 text-error hover:bg-error/30",
};

function Badge({ className, variant = "default", ...props }) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", badgeVariants[variant], className)} {...props} />
  );
}

export { Badge };
