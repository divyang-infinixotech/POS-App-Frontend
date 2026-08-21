import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryFormSchema } from '../validation/category.schema';
import AppButton from '../../../../components/common/AppButton';
import { X } from 'lucide-react';

export default function CategoryForm({ initialData, onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData || { name: '', sortOrder: 0, image: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
      {initialData && (
        <button type="button" onClick={onCancel} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase text-slate-400">Category Name</label>
        <input {...register('name')} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#16A34A]" />
        {errors.name && <p className="text-[9px] text-red-600 font-semibold">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase text-slate-400">Sort Order</label>
        <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#16A34A]" />
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase text-slate-400">Image URL (optional)</label>
        <input {...register('image')} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] outline-none focus:border-[#16A34A]" />
      </div>
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        {onCancel && <AppButton type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</AppButton>}
        <AppButton type="submit" loading={isSubmitting} className="flex-[2]">
          {initialData ? 'Update Category' : 'Add Category'}
        </AppButton>
      </div>
    </form>
  );
}
