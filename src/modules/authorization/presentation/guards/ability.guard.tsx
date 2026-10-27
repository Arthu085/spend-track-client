import { Outlet } from 'react-router';
import { ForbiddenPage } from '@/core/pages/forbidden.page';
import { PageLoader } from '@/shared/components/page-loader';
import { type Ability, hasAbility } from '../../domain/ability.schema';
import { useAbilities } from '../../infra/abilities.queries';

interface AbilityGuardProps {
  ability: Ability;
}

export const AbilityGuard = ({ ability }: AbilityGuardProps) => {
  const { data: abilities, isPending, isError, error } = useAbilities();

  if (isPending) {
    return <PageLoader />;
  }

  if (isError && abilities === undefined) {
    throw error;
  }

  if (!hasAbility(abilities, ability)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
};
