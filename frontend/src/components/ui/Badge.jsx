import React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-overlay/10 text-text-secondary",
  outline: "border-overlay/15 text-text-secondary bg-transparent",
  ghost: "border-transparent bg-transparent text-text-muted",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  error: "border-transparent bg-error/15 text-error",
};

function Badge({ className, variant = "default", ...props }) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", badgeVariants[variant], className)} {...props} />
  );
}

export { Badge };
