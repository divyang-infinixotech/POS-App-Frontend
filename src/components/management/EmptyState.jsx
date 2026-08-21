import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'No data available', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
      {icon || <Inbox className="w-10 h-10 text-slate-300" />}
      <p className="text-xs italic font-medium">{message}</p>
    </div>
  );
}
