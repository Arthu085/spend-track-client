import { z } from 'zod';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';

export const categoryKindSchema = z.enum(['EXPENSE', 'INCOME']);

export const categoryScopeSchema = z.enum(['GLOBAL', 'PERSONAL']);

export const categorySchema = z.object({
  uuid: z.string(),
  name: z.string(),
  kind: categoryKindSchema,
  kindLabel: z.string(),
  scope: categoryScopeSchema,
  scopeLabel: z.string(),
  color: z.string().nullable(),
  status: recordStatusSchema,
  statusLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type Category = z.infer<typeof categorySchema>;

export const isPersonalCategory = ({ scope }: Pick<Category, 'scope'>) =>
  scope === 'PERSONAL';

export const sortCategoriesByName = (
  categories: readonly Category[],
  language: string,
): Category[] =>
  [...categories].sort((left, right) =>
    left.name.localeCompare(right.name, language, { sensitivity: 'base' }),
  );
