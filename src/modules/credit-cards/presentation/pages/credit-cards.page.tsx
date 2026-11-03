import { PlusOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button, Flex, Form, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import { useListParams } from '@/shared/list/use-list-params';
import {
  creditCardFiltersShape,
  defaultCreditCardFilters,
} from '../../domain/credit-card-form.schemas';
import type { CreditCard } from '../../domain/credit-card.schema';
import { useCreditCards } from '../../infra/credit-cards.queries';
import { CreditCardFormModal } from '../components/credit-card-form.modal';
import { CreditCardsTable } from '../components/credit-cards-table';

export const CreditCardsPage = () => {
  const { t } = useTranslation();
  const listParams = useListParams(
    creditCardFiltersShape,
    defaultCreditCardFilters,
  );
  const { page, limit, filters } = listParams;
  const cardsQuery = useCreditCards({ page, limit, ...filters });
  const editor = useModalTarget<CreditCard>();

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('creditCards.title')}
        </Typography.Title>
        <Flex gap="middle" align="center" wrap>
          <Link to={AppRoutes.CREDIT_CARD_PURCHASES}>
            <ShoppingOutlined /> {t('creditCards.purchases.title')}
          </Link>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => editor.show()}
          >
            {t('creditCards.create.title')}
          </Button>
        </Flex>
      </Flex>
      <ListFiltersForm listParams={listParams}>
        <Form.Item name="status" label={t('creditCards.fields.status')}>
          <RecordStatusSelect />
        </Form.Item>
      </ListFiltersForm>
      <CreditCardsTable
        query={cardsQuery}
        listParams={listParams}
        onEdit={editor.show}
      />
      <CreditCardFormModal
        open={editor.open}
        card={editor.target}
        onClose={editor.close}
      />
    </Flex>
  );
};
