import { fireEvent, within } from '@testing-library/react';

export const findSectionHeader = (
  title: string,
  container: HTMLElement = document.body,
) =>
  within(container).findByRole('button', {
    name: (name) => name.startsWith(title),
  });

export const expandSection = async (
  title: string,
  container: HTMLElement = document.body,
) => {
  const header = await findSectionHeader(title, container);

  if (header.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(header);
  }

  return header;
};
