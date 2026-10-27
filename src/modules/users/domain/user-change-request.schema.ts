import { z } from 'zod';
import { roleSchema } from '@/modules/authorization/domain/role.schema';
import { isSameEmail } from './user-form.schemas';

const userProfileValuesSchema = z.object({
  name: z.string(),
  email: z.string(),
  roles: z.array(roleSchema),
});

export const userChangeRequestSchema = z.object({
  uuid: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED']),
  statusLabel: z.string(),
  requesterName: z.string().nullable(),
  current: userProfileValuesSchema,
  requested: userProfileValuesSchema,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export type UserProfileValues = z.infer<typeof userProfileValuesSchema>;
export type UserChangeRequest = z.infer<typeof userChangeRequestSchema>;

export type UserProfileField = keyof UserProfileValues;

const sameRoles = (
  roles: UserProfileValues['roles'],
  others: UserProfileValues['roles'],
) => {
  const uuids = new Set(roles.map(({ uuid }) => uuid));

  return (
    roles.length === others.length &&
    others.every(({ uuid }) => uuids.has(uuid))
  );
};

export const isProfileFieldChanged = (
  { current, requested }: Pick<UserChangeRequest, 'current' | 'requested'>,
  field: UserProfileField,
): boolean => {
  switch (field) {
    case 'name':
      return current.name !== requested.name;
    case 'email':
      return !isSameEmail(current.email, requested.email);
    case 'roles':
      return !sameRoles(current.roles, requested.roles);
  }
};
