import React from 'react';
import ManagementTable from '../../../../components/management/ManagementTable';
import { CUSTOMER_TABLE_COLUMNS } from '../constants/customer.constants';

export default function CustomerTable({ customers }) {
  const columns = [
    ...CUSTOMER_TABLE_COLUMNS,
    {
      key: 'createdAt',
      label: 'Since',
      render: (row) => (
        <span className="text-slate-500">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
  ];

  return <ManagementTable columns={columns} data={customers} />;
}
