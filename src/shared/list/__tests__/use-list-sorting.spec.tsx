import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { useListSorting } from '../use-list-sorting';

const sortBySchema = z.enum(['name', 'status']);

const SortingPage = () => {
  const { sorting } = useListSorting(sortBySchema);

  return <output aria-label="Sorting">{JSON.stringify(sorting)}</output>;
};

describe('useListSorting', () => {
  it.each([
    '',
    '?sortBy=password&sortOrder=ASC',
    '?sortBy=name&sortOrder=sideways',
    '?sortBy=name&sortOrder=',
    '?sortOrder=DESC',
    '?sortBy=name&sortBy=status&sortOrder=ASC',
    '?sortBy=name&sortOrder=ASC&sortOrder=DESC',
  ])('ignores invalid or absent URL sorting: %s', (search) => {
    const router = createMemoryRouter(
      [{ path: '/items', Component: SortingPage }],
      { initialEntries: [`/items${search}`] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByLabelText('Sorting')).toHaveTextContent('{}');
  });

  it('defaults the direction to ascending when only a field is supplied', () => {
    const router = createMemoryRouter(
      [{ path: '/items', Component: SortingPage }],
      { initialEntries: ['/items?sortBy=name'] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByLabelText('Sorting')).toHaveTextContent(
      JSON.stringify({ sortBy: 'name', sortOrder: 'ASC' }),
    );
  });
});
