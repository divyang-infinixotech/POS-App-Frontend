import React from 'react';
import AppTable from '../common/AppTable';
import AppCard from '../common/AppCard';

export default function ManagementTable({
  columns,
  data,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
}) {
  return (
    <AppCard padding={false}>
      <div className="p-1">
        <AppTable
          columns={columns}
          data={data}
          onRowClick={onRowClick}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </div>
    </AppCard>
  );
}
