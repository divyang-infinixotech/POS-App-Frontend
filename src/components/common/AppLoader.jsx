import React from 'react';
import { cn } from '../../lib/utils';

export function AppLoader({ className }) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <svg className="animate-spin w-6 h-6 text-[#16A34A]" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200 rounded-lg', className)}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-[18px] border border-slate-200 p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
