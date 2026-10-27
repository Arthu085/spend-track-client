import { z } from 'zod';
import { roleSchema } from '@/modules/authorization/domain/role.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';

export const userListItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  status: recordStatusSchema,
  statusLabel: z.string(),
  roles: z.array(roleSchema),
});

export const userDetailSchema = userListItemSchema.extend({
  email: z.string(),
  emailConfirmedAt: z.iso.datetime().nullable(),
  creatorName: z.string().nullable(),
  updaterName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;
export type UserDetail = z.infer<typeof userDetailSchema>;
