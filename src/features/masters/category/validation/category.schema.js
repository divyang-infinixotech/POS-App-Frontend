import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  sortOrder: z.number().min(0, 'Sort order must be positive'),
  image: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const categoryFormSchema = categorySchema;
