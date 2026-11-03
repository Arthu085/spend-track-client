import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { useListParams } from '@/shared/list/use-list-params';
import { recurrenceFiltersShape } from '../../domain/recurrence-form.schemas';
import type { Recurrence } from '../../domain/recurrence.schema';
import { useRecurrences } from '../../infra/recurrences.queries';
import { EditRecurrenceModal } from '../components/edit-recurrence.modal';
import { EndRecurrenceModal } from '../components/end-recurrence.modal';
import { RecurrenceFormModal } from '../components/recurrence-form.modal';
import { RecurrenceOccurrencesModal } from '../components/recurrence-occurrences.modal';
import { RecurrencesFilters } from '../components/recurrences-filters';
import { RecurrencesTable } from '../components/recurrences-table';

export const RecurrencesPage = () => {
  const { t } = useTranslation();
  const listParams = useListParams(recurrenceFiltersShape);
  const { page, limit, filters } = listParams;
  const recurrencesQuery = useRecurrences({ page, limit, ...filters });
  const [isCreating, setCreating] = useState(false);
  const editing = useModalTarget<Recurrence>();
  const ending = useModalTarget<Recurrence>();
  const viewing = useModalTarget<Recurrence>();

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('recurrences.title')}
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreating(true)}
        >
          {t('recurrences.create.title')}
        </Button>
      </Flex>
      <RecurrencesFilters listParams={listParams} />
      <RecurrencesTable
        query={recurrencesQuery}
        listParams={listParams}
        onShowOccurrences={viewing.show}
        onEdit={editing.show}
        onEnd={ending.show}
      />
      <RecurrenceFormModal
        open={isCreating}
        onClose={() => setCreating(false)}
      />
      <EditRecurrenceModal
        open={editing.open}
        recurrence={editing.target}
        onClose={editing.close}
      />
      <EndRecurrenceModal
        open={ending.open}
        recurrence={ending.target}
        onClose={ending.close}
      />
      <RecurrenceOccurrencesModal
        open={viewing.open}
        recurrence={viewing.target}
        onClose={viewing.close}
      />
    </Flex>
  );
};
