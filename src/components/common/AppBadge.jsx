import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-[#16A34A]/10 text-[#16A34A]',
};

export default function AppBadge({ children, variant = 'default', className, pulse }) {
  return (
    <span
      className={cn(
        'text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center',
        variants[variant],
        pulse && 'animate-pulse',
        className
      )}
    >
      {children}
    </span>
  );
}
