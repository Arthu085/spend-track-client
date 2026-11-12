import { z } from 'zod';
import { roleSchema } from '@/modules/authorization/domain/role.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';

export const userSortBySchema = z.enum([
  'name',
  'email',
  'status',
  'createdAt',
]);

export const userListItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  status: recordStatusSchema,
  statusLabel: z.string(),
  roles: z.array(roleSchema),
  emailConfirmedAt: z.iso.datetime().nullable(),
});

export const userDetailSchema = userListItemSchema.extend({
  email: z.string(),
  creatorName: z.string().nullable(),
  updaterName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;
export type UserDetail = z.infer<typeof userDetailSchema>;
