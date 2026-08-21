import React from 'react';
import AppDialog from '../../../../components/common/AppDialog';
import AppButton from '../../../../components/common/AppButton';
import { AlertTriangle } from 'lucide-react';

export default function DeleteCategoryDialog({ open, onClose, onConfirm, category }) {
  return (
    <AppDialog open={open} onClose={onClose} title="Delete Category" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-800">Are you sure?</p>
            <p className="text-[10px] text-red-600 mt-1">
              This will permanently delete <strong>{category?.name}</strong> and may affect menu items linked to this category.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AppButton variant="secondary" onClick={onClose} className="flex-1">Cancel</AppButton>
          <AppButton variant="danger" onClick={() => onConfirm(category)} className="flex-[2]">Delete</AppButton>
        </div>
      </div>
    </AppDialog>
  );
}
