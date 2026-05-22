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
