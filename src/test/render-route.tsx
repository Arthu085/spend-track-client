import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/core/config/query-client.config';
import { routes } from '@/core/router/routes';
import { clearSession } from '@/modules/auth/infra/auth.queries';

export const renderRoute = (path: string) => {
  const queryClient = createQueryClient({ onUnauthorized: clearSession });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </QueryClientProvider>,
  );

  return { router, queryClient };
};
