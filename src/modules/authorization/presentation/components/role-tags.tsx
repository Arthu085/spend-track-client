import { Flex, Tag } from 'antd';
import type { Role } from '../../domain/role.schema';

interface RoleTagsProps {
  roles: readonly Role[];
}

export const RoleTags = ({ roles }: RoleTagsProps) => (
  <Flex component="span" wrap gap="small">
    {roles.map(({ uuid, roleLabel }) => (
      <Tag key={uuid}>{roleLabel}</Tag>
    ))}
  </Flex>
);
