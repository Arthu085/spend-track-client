import { InputNumber, type InputNumberProps } from 'antd';
import { useTranslation } from 'react-i18next';

type MoneyInputProps = Omit<
  InputNumberProps<string>,
  'stringMode' | 'precision' | 'decimalSeparator'
>;

// String mode keeps the typed digits exact; a JavaScript number would round
// large amounts before they reach the API.
export const MoneyInput = (props: MoneyInputProps) => {
  const { i18n } = useTranslation();

  return (
    <InputNumber<string>
      {...props}
      stringMode
      precision={2}
      decimalSeparator={i18n.language === 'pt-BR' ? ',' : '.'}
      prefix="R$"
      style={{ width: '100%', ...props.style }}
    />
  );
};
