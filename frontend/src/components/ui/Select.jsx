import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Select({ className, children, label, value, onChange, disabled, ...props }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parse <option> children into a flat array of { value, label, disabled }
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: String(child.props.value ?? ''),
      label: child.props.children,
      disabled: child.props.disabled ?? false,
    }));

  const selected = options.find(o => String(o.value) === String(value));
  const placeholder = options.find(o => o.disabled && o.value === '')?.label ?? 'Select...';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (optValue) => {
    onChange?.({ target: { value: optValue } });
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {label && <label className="mb-2 block text-sm font-medium text-text-muted">{label}</label>}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full h-10 pl-3 pr-9 rounded-lg text-sm text-left",
          "bg-surface border border-overlay/[0.1] text-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-overlay/20 focus:border-overlay/20",
          "transition-all hover:border-overlay/20 hover:bg-overlay/[0.03]",
          "disabled:opacity-40 disabled:pointer-events-none",
          open && "border-overlay/20 ring-2 ring-overlay/20",
        )}
        {...props}
      >
        <span className={selected ? 'text-text-primary' : 'text-text-muted opacity-60'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-transform duration-150",
          open && "rotate-180"
        )} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={cn(
          "absolute z-50 mt-1.5 w-full",
          "rounded-xl border border-overlay/[0.1] bg-surface shadow-2xl shadow-black/40",
          "py-1.5 max-h-60 overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-overlay/20 scrollbar-track-transparent",
          "animate-in fade-in-0 zoom-in-95 duration-100"
        )}>
          {options.filter(o => !(o.disabled && o.value === '')).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm text-left",
                "transition-colors duration-100",
                opt.disabled
                  ? "opacity-40 cursor-not-allowed text-text-muted"
                  : "cursor-pointer hover:bg-overlay/[0.07] text-text-primary",
                String(opt.value) === String(value) && !opt.disabled
                  ? "bg-overlay/[0.06] text-text-primary font-medium"
                  : ""
              )}
            >
              <span>{opt.label}</span>
              {String(opt.value) === String(value) && !opt.disabled && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
