import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { categoryKindSchema } from './category.schema';

export const CATEGORY_NAME_MAX_LENGTH = 100;

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const required = () => i18n.t('validation.required');

export const categoryFormSchema = z.object({
  name: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(CATEGORY_NAME_MAX_LENGTH, {
      error: () =>
        i18n.t('validation.maxLength', { max: CATEGORY_NAME_MAX_LENGTH }),
    }),
  kind: z.enum(categoryKindSchema.options, { error: required }),
  color: z.string().regex(HEX_COLOR_PATTERN).optional(),
});

export type CategoryForm = z.infer<typeof categoryFormSchema>;
