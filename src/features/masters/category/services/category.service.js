import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../../../../api/category.api';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const resp = await categoryApi.getAll();
      const categories = resp.categories || [];
      return categories.map((c) => ({
        id: `cat-${c.id}`,
        name: c.name,
        sortOrder: c.sortOrder || 0,
        image: c.image || '',
      }));
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => categoryApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => categoryApi.update(parseInt(id.replace('cat-', '')), data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => categoryApi.delete(parseInt(id.replace('cat-', ''))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};
