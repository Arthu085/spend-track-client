import { z } from 'zod';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { abilitySchema } from './ability.schema';

export const roleSchema = z.object({
  uuid: z.string(),
  role: z.enum(['ADMIN', 'USER']),
  roleLabel: z.string(),
  status: recordStatusSchema,
  statusLabel: z.string(),
});

export const roleDetailSchema = roleSchema.extend({
  abilities: z.array(abilitySchema),
});

export type Role = z.infer<typeof roleSchema>;
export type RoleDetail = z.infer<typeof roleDetailSchema>;

export const isAdminRole = ({ role }: Pick<Role, 'role'>): boolean =>
  role === 'ADMIN';

export const hasAdminRole = (roles: readonly Role[]): boolean =>
  roles.some(isAdminRole);
