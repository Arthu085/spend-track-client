import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, toLanguage } from './language';
import { useChangeLanguage } from './use-change-language';

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const changeLanguageMutation = useChangeLanguage();

  return (
    <Select
      aria-label={t('language.label')}
      value={toLanguage(i18n.language)}
      options={SUPPORTED_LANGUAGES.map((language) => ({
        value: language,
        label: t(`language.names.${language}`),
      }))}
      onChange={(language) => changeLanguageMutation.mutate(language)}
      popupMatchSelectWidth={false}
    />
  );
};
