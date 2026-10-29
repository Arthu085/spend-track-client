import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Segmented, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import type { Account } from '../../domain/account.schema';
import { useAccounts } from '../../infra/accounts.queries';
import { AccountFormModal } from '../components/account-form.modal';
import { AccountsTable } from '../components/accounts-table';

type EditorState = { mode: 'create' } | { mode: 'edit'; account: Account };

export const AccountsPage = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RecordStatus>('ACTIVE');
  const accountsQuery = useAccounts({ status });
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
      <Segmented<RecordStatus>
        aria-label={t('accounts.fields.status')}
        value={status}
        onChange={setStatus}
        options={[
          { value: 'ACTIVE', label: t('accounts.filters.active') },
          { value: 'INACTIVE', label: t('accounts.filters.archived') },
        ]}
      />
      <AccountsTable
        query={accountsQuery}
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
