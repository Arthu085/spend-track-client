import { queryOptions, useQuery } from '@tanstack/react-query';
import { authRevalidationOptions } from '@/modules/auth/infra/auth.queries';
import { fetchAbilityCatalog, fetchOwnAbilities } from './abilities.api';

export const abilitiesQuery = queryOptions({
  ...authRevalidationOptions,
  queryKey: ['authorization', 'abilities'],
  queryFn: fetchOwnAbilities,
});

export const abilityCatalogQuery = queryOptions({
  queryKey: ['authorization', 'ability-catalog'],
  queryFn: fetchAbilityCatalog,
});

export const useAbilities = () => useQuery(abilitiesQuery);

export const useAbilityCatalog = ({ enabled }: { enabled: boolean }) =>
  useQuery({ ...abilityCatalogQuery, enabled });
