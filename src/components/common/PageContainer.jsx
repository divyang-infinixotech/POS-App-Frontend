import React from 'react';
import { cn } from '../../lib/utils';

export default function PageContainer({ children, className }) {
  return (
    <div className={cn('space-y-4 animate-fade-in text-[#191c1e] max-w-7xl mx-auto', className)}>
      {children}
    </div>
  );
}
