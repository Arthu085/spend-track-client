import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useListParams } from '@/shared/list/use-list-params';
import {
  accountFiltersShape,
  defaultAccountFilters,
} from '../../domain/account-form.schemas';
import type { Account } from '../../domain/account.schema';
import { useAccounts } from '../../infra/accounts.queries';
import { AccountFormModal } from '../components/account-form.modal';
import { AccountsFilters } from '../components/accounts-filters';
import { AccountsTable } from '../components/accounts-table';

type EditorState = { mode: 'create' } | { mode: 'edit'; account: Account };

export const AccountsPage = () => {
  const { t } = useTranslation();
  const listParams = useListParams(accountFiltersShape, defaultAccountFilters);
  const { page, limit, filters } = listParams;
  const accountsQuery = useAccounts({ page, limit, ...filters });
  const [editor, setEditor] = useState<EditorState | null>(null);

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('accounts.title')}
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditor({ mode: 'create' })}
        >
          {t('accounts.create.title')}
        </Button>
      </Flex>
      <AccountsFilters listParams={listParams} />
      <AccountsTable
        query={accountsQuery}
        listParams={listParams}
        onEdit={(account) => setEditor({ mode: 'edit', account })}
      />
      <AccountFormModal
        open={editor !== null}
        account={editor?.mode === 'edit' ? editor.account : undefined}
        onClose={() => setEditor(null)}
      />
    </Flex>
  );
};
