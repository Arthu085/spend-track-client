import { CheckOutlined, HistoryOutlined } from '@ant-design/icons';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Popconfirm } from 'antd';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { IconActionButton } from '../icon-action-button';
import { IconActionLink } from '../icon-action-link';

const label = 'Confirm the rent';

const findTooltip = () => screen.findByRole('tooltip');

const focusWithKeyboard = (element: HTMLElement) => {
  fireEvent.keyDown(document.body, { key: 'Tab' });
  act(() => element.focus());
};

describe('IconActionButton', () => {
  it('names the button with the label and keeps its behavior', () => {
    const onClick = vi.fn();

    render(
      <IconActionButton
        label={label}
        icon={<CheckOutlined />}
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows the label on hover and hides it when the pointer leaves', async () => {
    render(<IconActionButton label={label} icon={<CheckOutlined />} />);
    const button = screen.getByRole('button', { name: label });

    fireEvent.mouseEnter(button);

    expect(await findTooltip()).toHaveTextContent(label);

    fireEvent.mouseLeave(button);

    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  });

  it('shows the label on keyboard focus and hides it on blur', async () => {
    render(<IconActionButton label={label} icon={<CheckOutlined />} />);
    const button = screen.getByRole('button', { name: label });

    focusWithKeyboard(button);

    expect(await findTooltip()).toHaveTextContent(label);

    act(() => button.blur());

    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  });

  it('hides the label once clicked, so it never covers what the click opens', async () => {
    render(<IconActionButton label={label} icon={<CheckOutlined />} />);
    const button = screen.getByRole('button', { name: label });

    fireEvent.mouseEnter(button);
    await findTooltip();
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  });

  it('still shows the label of a disabled button', async () => {
    const onClick = vi.fn();

    render(
      <IconActionButton
        label={label}
        icon={<CheckOutlined />}
        disabled
        onClick={onClick}
      />,
    );
    const button = screen.getByRole('button', { name: label });

    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.mouseEnter(button.parentElement as HTMLElement);

    expect(await findTooltip()).toHaveTextContent(label);
  });

  it('opens a surrounding Popconfirm without duplicating its name', async () => {
    const onConfirm = vi.fn();

    render(
      <Popconfirm title="Are you sure?" okText="Yes" onConfirm={onConfirm}>
        <IconActionButton label={label} icon={<CheckOutlined />} />
      </Popconfirm>,
    );

    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
  });
});

describe('IconActionLink', () => {
  it('names the link and shows the label on hover and keyboard focus', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <IconActionLink
            to="/history"
            label="History"
            icon={<HistoryOutlined />}
          />
        ),
      },
    ]);

    render(<RouterProvider router={router} />);
    const link = screen.getByRole('link', { name: 'History' });

    expect(link).toHaveAttribute('href', '/history');

    fireEvent.mouseEnter(link);
    expect(await findTooltip()).toHaveTextContent('History');
    fireEvent.mouseLeave(link);
    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );

    focusWithKeyboard(link);
    expect(await findTooltip()).toHaveTextContent('History');
  });
});
