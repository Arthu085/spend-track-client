import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from './language';
import { onStoredLanguageChange, storeLanguage } from './language-preference';

export const useChangeLanguage = () => {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (language: Language) => {
      storeLanguage(language);
      await i18n.changeLanguage(language);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
};

export const useLanguageSync = () => {
  const { mutate: changeLanguage } = useChangeLanguage();

  useEffect(() => onStoredLanguageChange(changeLanguage), [changeLanguage]);
};
