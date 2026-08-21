import React from 'react';
import { cn } from '../../lib/utils';

export default function ManagementHeader({
  tabs,
  activeTab,
  onTabChange,
  totalCount,
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
      <div className="flex gap-1 overflow-x-auto no-scrollbar min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'border-[#16A34A] text-[#16A34A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-[10px] text-slate-400">({tab.count})</span>
            )}
          </button>
        ))}
      </div>
      {totalCount !== undefined && (
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
          Total: {totalCount}
        </span>
      )}
    </div>
  );
}
