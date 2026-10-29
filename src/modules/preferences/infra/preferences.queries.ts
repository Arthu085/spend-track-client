import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardKey } from '@/modules/dashboard/infra/dashboard.queries';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import { fetchPreferences, updatePreferences } from './preferences.api';

const preferencesKey = ['preferences'] as const;

export const usePreferences = () =>
  useQuery({ queryKey: preferencesKey, queryFn: fetchPreferences });

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn: updatePreferences,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      queryClient.setQueryData(preferencesKey, response.data);
      await queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
};
