import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AppDialog({
  open,
  onClose,
  title,
  children,
  size = 'sm',
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className={cn(
          'bg-white w-full rounded-xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]',
          sizes[size]
        )}
      >
        {title && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
              {title}
            </h4>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
