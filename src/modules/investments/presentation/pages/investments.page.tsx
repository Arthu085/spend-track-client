import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { useListParams } from '@/shared/list/use-list-params';
import {
  defaultInvestmentFilters,
  investmentFiltersShape,
} from '../../domain/investment-form.schemas';
import type { Investment } from '../../domain/investment.schema';
import { useInvestments } from '../../infra/investments.queries';
import { InvestmentFormModal } from '../components/investment-form.modal';
import {
  InvestmentMovementModal,
  type MovementTarget,
} from '../components/investment-movement.modal';
import { InvestmentValuationModal } from '../components/investment-valuation.modal';
import { InvestmentsFilters } from '../components/investments-filters';
import { InvestmentsTable } from '../components/investments-table';

type EditorState =
  { mode: 'create' } | { mode: 'edit'; investment: Investment };

export const InvestmentsPage = () => {
  const { t } = useTranslation();
  const listParams = useListParams(
    investmentFiltersShape,
    defaultInvestmentFilters,
  );
  const { page, limit, filters } = listParams;
  const investmentsQuery = useInvestments({ page, limit, ...filters });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const moving = useModalTarget<MovementTarget>();
  const valuating = useModalTarget<Investment>();

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {t('investments.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('investments.description')}
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditor({ mode: 'create' })}
        >
          {t('investments.create.title')}
        </Button>
      </Flex>
      <InvestmentsFilters listParams={listParams} />
      <InvestmentsTable
        query={investmentsQuery}
        listParams={listParams}
        onEdit={(investment) => setEditor({ mode: 'edit', investment })}
        onMove={(investment, type) => moving.show({ investment, type })}
        onValuate={(investment) => valuating.show(investment)}
      />
      <InvestmentFormModal
        open={editor !== null}
        investment={editor?.mode === 'edit' ? editor.investment : undefined}
        onClose={() => setEditor(null)}
      />
      <InvestmentMovementModal
        open={moving.open}
        target={moving.target}
        onClose={moving.close}
      />
      <InvestmentValuationModal
        open={valuating.open}
        investment={valuating.target}
        onClose={valuating.close}
      />
    </Flex>
  );
};
