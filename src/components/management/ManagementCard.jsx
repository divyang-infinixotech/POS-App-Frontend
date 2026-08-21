import React from 'react';
import { cn } from '../../lib/utils';

export default function ManagementCard({
  children,
  active,
  hover = true,
  onClick,
  className,
}) {
  return (
    <div
      className={cn(
        'border border-slate-200 rounded-2xl p-3.5 bg-white flex flex-col gap-2',
        hover && 'hover:border-[#16A34A] hover:shadow-md transition-all',
        active && 'border-[#16A34A] ring-1 ring-[#16A34A]/30 bg-[#16A34A]/5',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
