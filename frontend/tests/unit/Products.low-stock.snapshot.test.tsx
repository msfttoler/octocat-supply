// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import Products from '../../src/components/entity/product/Products';
import { ThemeProvider } from '../../src/context/ThemeContext';

describe('Products low stock snapshot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('matches snapshot when at least one item is low stock', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        data: [
          {
            productId: 1,
            supplierId: 1,
            name: 'SmartFeeder One',
            description: 'AI-powered feeder',
            price: 129.99,
            stock: 5,
            imgName: 'smart-feeder.png',
            sku: 'CAT-FEED-001',
            unit: 'piece',
          },
          {
            productId: 2,
            supplierId: 1,
            name: 'CatFlix Entertainment Portal',
            description: 'On-demand cat entertainment',
            price: 89.99,
            stock: 22,
            imgName: 'catflix.png',
            sku: 'CAT-FLIX-001',
            unit: 'piece',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 2,
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Products />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    await screen.findByText('SmartFeeder One');
    expect(container.firstChild).toMatchSnapshot();
  });
});
