import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700 font-semibold">
      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
      <span className="flex-1">{message || 'Something went wrong'}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-red-800 font-bold transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
