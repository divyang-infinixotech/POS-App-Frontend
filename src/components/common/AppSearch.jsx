import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AppSearch({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
}) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange?.(localValue);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs]);

  return (
    <div className={cn('relative', className)}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 h-10 bg-white border border-slate-200 focus:border-[#16A34A] rounded-xl text-xs outline-none transition-all"
      />
    </div>
  );
}
