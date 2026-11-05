import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EqualHeightCard } from '../equal-height-card';

describe('EqualHeightCard', () => {
  it('fills the height of its column and keeps the styles it receives', () => {
    render(
      <EqualHeightCard data-testid="card" style={{ marginTop: 8 }}>
        Content
      </EqualHeightCard>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveStyle({
      height: '100%',
      marginTop: '8px',
    });
  });
});
