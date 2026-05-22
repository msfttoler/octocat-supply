import { QueryClient, QueryClientProvider } from 'react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import Products from './Products';
import { ThemeContext } from '../../../context/themeContextUtils';

vi.mock('axios');

const mockedAxios = vi.mocked(axios, true);

function renderProducts() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ darkMode: false, toggleTheme: vi.fn() }}>
        <Products />
      </ThemeContext.Provider>
    </QueryClientProvider>,
  );
}

describe('Products low stock badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a low stock badge and tooltip when stock is below 10', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          productId: 1,
          name: 'Catnip Deluxe',
          description: 'Premium catnip blend',
          price: 19.99,
          imgName: 'catnip.png',
          sku: 'CAT-001',
          unit: 'bag',
          supplierId: 10,
          stockLevel: 4,
        },
      ],
    });

    renderProducts();

    expect(await screen.findByText('Catnip Deluxe')).toBeInTheDocument();

    const badge = screen.getByText('Low stock');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Only 4 left in stock');
  });

  it('does not show a low stock badge when stock is exactly 10', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          productId: 3,
          name: 'Cat Wand',
          description: 'Interactive wand toy',
          price: 9.99,
          imgName: 'cat-wand.png',
          sku: 'CAT-003',
          unit: 'unit',
          supplierId: 12,
          stockLevel: 10,
        },
      ],
    });

    renderProducts();

    expect(await screen.findByText('Cat Wand')).toBeInTheDocument();
    expect(screen.queryByText('Low stock')).not.toBeInTheDocument();
  });

  it('does not show a low stock badge when stockLevel is undefined', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          productId: 4,
          name: 'Laser Pointer',
          description: 'Fun laser toy',
          price: 5.99,
          imgName: 'laser.png',
          sku: 'CAT-004',
          unit: 'unit',
          supplierId: 13,
        },
      ],
    });

    renderProducts();

    expect(await screen.findByText('Laser Pointer')).toBeInTheDocument();
    expect(screen.queryByText('Low stock')).not.toBeInTheDocument();
  });

  it('matches catalog snapshot with a low stock item', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          productId: 2,
          name: 'Scratch Tower',
          description: 'Tall scratching tower for active cats',
          price: 79.99,
          imgName: 'scratch-tower.png',
          sku: 'CAT-002',
          unit: 'unit',
          supplierId: 11,
          stockLevel: 3,
        },
      ],
    });

    const { asFragment } = renderProducts();

    expect(await screen.findByText('Scratch Tower')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });
});
