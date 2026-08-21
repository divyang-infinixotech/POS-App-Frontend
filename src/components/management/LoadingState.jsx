import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-xs gap-2">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span className="font-semibold">{message}</span>
    </div>
  );
}
