import React from 'react';
import { cn } from '../../lib/utils';

export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3', className)}>
      <div>
        <h3 className="text-lg font-extrabold text-[#191c1e]">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
