import React from 'react';
import { cn } from '../../lib/utils';

export default function AppCard({ children, className, hover, onClick, padding = true }) {
  return (
    <div
      className={cn(
        'bg-white rounded-[18px] border border-slate-200 shadow-xs',
        padding && 'p-4',
        hover && 'hover:shadow-md transition-all',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
