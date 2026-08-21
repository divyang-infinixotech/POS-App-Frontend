import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../../../api/customer.api';

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const resp = await customerApi.getAll();
      return resp.data || [];
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => customerApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
};
