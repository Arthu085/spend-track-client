import { screen, waitFor, within } from '@testing-library/react';

// Ant Design gives every generated id the same value under test, so a dialog's
// accessible name may resolve to another element; match its text instead.
export const findDialog = (title: string) =>
  waitFor(() => {
    const dialog = screen
      .getAllByRole('dialog')
      .find((element) => within(element).queryAllByText(title).length > 0);

    if (!dialog) {
      throw new Error(`No dialog shows "${title}"`);
    }

    return dialog;
  });
