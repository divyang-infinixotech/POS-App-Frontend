import { useCustomers, useCreateCustomer } from '../services/customer.service';

export function useCustomer() {
  const { data: customers = [], isLoading, error } = useCustomers();
  const createMutation = useCreateCustomer();

  const addCustomer = async (data) => {
    return createMutation.mutateAsync(data);
  };

  return { customers, loading: isLoading, error: error?.message, addCustomer };
}
