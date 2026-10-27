import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ApiResponse } from '@/core/http/api-envelope';

export const useApiSuccessMessage = () => {
  const { message } = App.useApp();
  const { t } = useTranslation();

  return ({ meta }: Pick<ApiResponse<unknown>, 'meta'>) => {
    message.success(meta.message ?? t('feedback.success'));
  };
};
