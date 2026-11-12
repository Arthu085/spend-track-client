import { Collapse, type CollapseProps, Flex, Tag, Typography } from 'antd';

export interface DetailsCount {
  key: string;
  label: string;
  color?: string;
}

interface DetailsLabelProps {
  title: string;
  counts?: (DetailsCount | false)[];
}

export const DetailsLabel = ({ title, counts = [] }: DetailsLabelProps) => (
  <Flex align="center" gap="small" wrap>
    <Typography.Text strong>{title}</Typography.Text>
    {counts.map(
      (count) =>
        count && (
          <Tag key={count.key} color={count.color} style={{ margin: 0 }}>
            {count.label}
          </Tag>
        ),
    )}
  </Flex>
);

interface DetailsCollapseProps {
  items: CollapseProps['items'];
}

export const DetailsCollapse = ({ items }: DetailsCollapseProps) => {
  if (!items?.length) {
    return null;
  }

  return (
    <Collapse
      ghost
      size="small"
      items={items}
      styles={{
        header: { paddingInline: 0 },
        body: { paddingInline: 0 },
      }}
    />
  );
};
