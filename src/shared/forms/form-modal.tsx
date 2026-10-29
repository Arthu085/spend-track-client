import { Form, Modal } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface FormModalProps<T> {
  open: boolean;
  title: ReactNode;
  initialValues?: Partial<T>;
  submitting: boolean;
  readOnly?: boolean;
  onSubmit: (values: T) => void;
  onCancel: () => void;
  children: ReactNode;
}

export const FormModal = <T extends object>({
  open,
  title,
  initialValues,
  submitting,
  readOnly = false,
  onSubmit,
  onCancel,
  children,
}: FormModalProps<T>) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={title}
      okText={t('common.save')}
      okButtonProps={{ htmlType: 'submit' }}
      cancelText={readOnly ? t('common.close') : undefined}
      footer={readOnly ? (_, { CancelBtn }) => <CancelBtn /> : undefined}
      confirmLoading={submitting}
      onCancel={onCancel}
      destroyOnHidden
      modalRender={(dom) => (
        <Form<T>
          layout="vertical"
          requiredMark={false}
          disabled={submitting || readOnly}
          initialValues={initialValues}
          onFinish={onSubmit}
        >
          {dom}
        </Form>
      )}
    >
      {children}
    </Modal>
  );
};
