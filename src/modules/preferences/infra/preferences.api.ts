import {
  type ApiResponse,
  parseApiData,
  parseApiResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import {
  type Preferences,
  type PreferencesPayload,
  preferencesSchema,
} from '../domain/preferences.schema';

export const fetchPreferences = async (): Promise<Preferences> => {
  const response = await httpClient.get<unknown>('/preferences');

  return parseApiData(preferencesSchema, response.data);
};

export const updatePreferences = async (
  payload: PreferencesPayload,
): Promise<ApiResponse<Preferences>> => {
  const response = await httpClient.patch<unknown>('/preferences', payload);

  return parseApiResponse(preferencesSchema, response.data);
};
