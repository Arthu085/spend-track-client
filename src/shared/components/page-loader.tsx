import { Flex, Spin } from 'antd';

export const PageLoader = () => (
  <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
    <Spin size="large" />
  </Flex>
);
