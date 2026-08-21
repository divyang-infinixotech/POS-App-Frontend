import React from 'react';
import AppSearch from '../common/AppSearch';
import { cn } from '../../lib/utils';

export default function ManagementToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  className,
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-2', className)}>
      <AppSearch
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="flex-1"
      />
      {filters && <div className="flex gap-1">{filters}</div>}
      {actions && <div className="flex gap-1.5">{actions}</div>}
    </div>
  );
}
