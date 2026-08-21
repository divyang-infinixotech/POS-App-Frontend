import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema } from "../validation/customer.schema";
import AppButton from "../../../../components/common/AppButton";

export default function CustomerForm({ initialData, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || { name: "", phone: "", email: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase text-slate-400">
          Customer Name
        </label>
        <input
          {...register("name")}
          className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none"
        />
        {errors.name && (
          <p className="text-[9px] text-red-600">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase text-slate-400">
          Phone
        </label>
        <input
          {...register("phone")}
          className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none"
        />
        {errors.phone && (
          <p className="text-[9px] text-red-600">{errors.phone.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase text-slate-400">
          Email (optional)
        </label>
        <input
          {...register("email")}
          className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none"
        />
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <AppButton type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </AppButton>
        )}
        <AppButton type="submit">
          {initialData ? "Update" : "Add Customer"}
        </AppButton>
      </div>
    </form>
  );
}
