import React from 'react';
import { Edit, Trash } from 'lucide-react';
import ManagementTable from '../../../../components/management/ManagementTable';
import { CATEGORY_TABLE_COLUMNS } from '../constants/category.constants';

export default function CategoryTable({ categories, onEdit, onDelete, menuItems }) {
  const getItemCount = (catName) => {
    return menuItems?.filter((m) => m.category === catName).length || 0;
  };

  const columns = [
    ...CATEGORY_TABLE_COLUMNS,
    {
      key: 'itemCount',
      label: 'Items',
      render: (row) => (
        <span className="font-bold text-slate-600">{getItemCount(row.name)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); onEdit(row); }}
            className="p-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-slate-500 transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(row); }}
            className="p-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-800 rounded-lg text-slate-500 transition-colors">
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const data = categories.map((cat) => ({
    ...cat,
    itemCount: getItemCount(cat.name),
  }));

  return (
    <ManagementTable
      columns={columns}
      data={data}
    />
  );
}
