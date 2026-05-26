// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LowStockBadge from '../../src/components/entity/product/LowStockBadge';

describe('LowStockBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders low stock badge with tooltip text for low stock items', () => {
    render(<LowStockBadge stock={4} />);

    const badge = screen.getByText('Low stock');
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('title')).toBe('Only 4 left in stock');
  });

  it('does not render when stock is undefined, at threshold, or above threshold', () => {
    const { rerender, queryByText } = render(<LowStockBadge />);

    expect(queryByText('Low stock')).toBeNull();

    rerender(<LowStockBadge stock={10} />);
    expect(queryByText('Low stock')).toBeNull();

    rerender(<LowStockBadge stock={25} />);
    expect(queryByText('Low stock')).toBeNull();
  });
});
