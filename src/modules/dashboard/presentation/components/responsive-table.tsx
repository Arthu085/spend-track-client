import {
  Flex,
  Grid,
  Table,
  type TableColumnsType,
  theme,
  Typography,
} from 'antd';
import type { ReactNode } from 'react';

export interface CompactRow {
  title: ReactNode;
  description?: ReactNode;
  amount?: ReactNode;
  action?: ReactNode;
  extra?: ReactNode;
}

interface ResponsiveTableProps<T extends { uuid: string }> {
  columns: TableColumnsType<T>;
  dataSource: T[];
  compactRow: (record: T) => CompactRow;
}

export const ResponsiveTable = <T extends { uuid: string }>({
  columns,
  dataSource,
  compactRow,
}: ResponsiveTableProps<T>) => {
  const { md } = Grid.useBreakpoint();
  const { token } = theme.useToken();

  if (md) {
    return (
      <Table<T>
        rowKey="uuid"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 'max-content' }}
      />
    );
  }

  const divider = `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`;

  return (
    <Flex
      vertical
      component="ul"
      style={{ margin: 0, padding: 0, listStyle: 'none' }}
    >
      {dataSource.map((record, index) => {
        const { title, description, amount, action, extra } =
          compactRow(record);

        return (
          <Flex
            key={record.uuid}
            vertical
            gap="small"
            component="li"
            style={{
              paddingBlock: token.paddingSM,
              borderBlockStart: index > 0 ? divider : undefined,
            }}
          >
            <Flex justify="space-between" align="start" gap="small">
              <Flex
                vertical
                flex={1}
                style={{ minWidth: 0, overflowWrap: 'anywhere' }}
              >
                {title}
                {description && (
                  <Typography.Text type="secondary">
                    {description}
                  </Typography.Text>
                )}
              </Flex>
              <Flex align="center" gap="small" style={{ flexShrink: 0 }}>
                {amount}
                {action}
              </Flex>
            </Flex>
            {extra}
          </Flex>
        );
      })}
    </Flex>
  );
};
