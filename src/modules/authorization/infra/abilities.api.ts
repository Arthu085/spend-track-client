import { z } from 'zod';
import { parseApiData } from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import { type Ability, abilitySchema } from '../domain/ability.schema';

export const fetchOwnAbilities = async (): Promise<Ability[]> => {
  const response = await httpClient.get<unknown>('/users/me/abilities');

  return parseApiData(z.array(abilitySchema), response.data);
};

export const fetchAbilityCatalog = async (): Promise<Ability[]> => {
  const response = await httpClient.get<unknown>('/abilities');

  return parseApiData(z.array(abilitySchema), response.data);
};
