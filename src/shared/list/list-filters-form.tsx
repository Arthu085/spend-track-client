import { Button, Col, Form, Row, theme } from 'antd';
import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import type { FilterShape, ListFilters, ListParams } from './use-list-params';

export const FILTERS_DEBOUNCE_MS = 400;

interface ListFiltersFormProps<S extends FilterShape> {
  listParams: ListParams<S>;
  children: ReactNode;
}

const normalize = (value: unknown) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export const ListFiltersForm = <S extends FilterShape>({
  listParams: { filters, setFilters },
  children,
}: ListFiltersFormProps<S>) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { key: locationKey } = useLocation();
  const [form] = Form.useForm<ListFilters<S>>();
  const pendingFiltersTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancelPendingFilters = useCallback(() => {
    clearTimeout(pendingFiltersTimer.current);
  }, []);

  const applyFilters = (values: ListFilters<S>) => {
    cancelPendingFilters();
    setFilters(values);
  };

  const debounceFilters = (values: ListFilters<S>) => {
    cancelPendingFilters();
    pendingFiltersTimer.current = setTimeout(() => {
      applyFilters(values);
    }, FILTERS_DEBOUNCE_MS);
  };

  const syncFormWithUrl = useEffectEvent(() => {
    const current: Record<string, unknown> = form.getFieldsValue();
    const outdated: ListFilters<S> = {};

    for (const key of Object.keys(current) as (keyof S & string)[]) {
      if (normalize(current[key]) !== filters[key]) {
        outdated[key] = filters[key];
      }
    }

    form.setFieldsValue(outdated);
  });

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    syncFormWithUrl();
  }, [filtersKey, locationKey]);

  useEffect(() => cancelPendingFilters, [cancelPendingFilters, locationKey]);

  return (
    <Form<ListFilters<S>>
      form={form}
      name="list-filters"
      role="search"
      aria-label={t('list.filters.label')}
      layout="vertical"
      initialValues={filters}
      onValuesChange={(_, values) => debounceFilters(values)}
    >
      <Row gutter={token.margin} align="bottom">
        {Children.map(
          children,
          (filter) =>
            filter && (
              <Col xs={24} sm={12} md={8} xl={4}>
                {filter}
              </Col>
            ),
        )}
        <Col flex="none">
          <Form.Item>
            <Button onClick={() => applyFilters({})}>
              {t('list.filters.clear')}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
