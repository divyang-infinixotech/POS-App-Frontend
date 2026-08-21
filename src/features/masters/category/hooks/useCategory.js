import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../services/category.service';

export function useCategory() {
  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const addCategory = async (category) => {
    return createMutation.mutateAsync({
      name: category.name,
      image: category.image,
    });
  };

  const updateCategory = async (id, updates) => {
    const backendId = parseInt(id.replace('cat-', ''));
    return updateMutation.mutateAsync({
      id,
      data: { name: updates.name, isActive: true },
    });
  };

  const deleteCategory = async (id) => {
    return deleteMutation.mutateAsync(id);
  };

  return {
    categories,
    loading: isLoading,
    error: error?.message,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh: refetch,
  };
}
