import React from 'react';
import AppDialog from '../../../../components/common/AppDialog';
import AppButton from '../../../../components/common/AppButton';
import { AlertTriangle } from 'lucide-react';

export default function DeleteCustomerDialog({ open, onClose, onConfirm, customer }) {
  return (
    <AppDialog open={open} onClose={onClose} title="Delete Customer">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-xs font-semibold text-red-700">
            Delete customer <strong>{customer?.name}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <AppButton variant="secondary" onClick={onClose} className="flex-1">Cancel</AppButton>
          <AppButton variant="danger" onClick={() => onConfirm(customer)} className="flex-[2]">Delete</AppButton>
        </div>
      </div>
    </AppDialog>
  );
}
