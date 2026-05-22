import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter from './product';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

async function seedProducts(count: number) {
  const db = await getDatabase();
  for (let i = 1; i <= count; i++) {
    await db.run(
      'INSERT INTO products (supplier_id, name, description, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, `Product ${i}`, `Description ${i}`, i, `SKU-${i}`, 'piece', `img-${i}.png`, 0],
    );
  }
}

describe('Product API pagination', () => {
  beforeAll(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier One']);

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const db = await getDatabase();
    await db.run('DELETE FROM products');
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('uses default pagination values', async () => {
    await seedProducts(25);

    const response = await request(app).get('/products');

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.total).toBe(25);
    expect(response.body.data).toHaveLength(20);
    expect(response.body.data[0].productId).toBe(1);
  });

  it('supports custom page and pageSize', async () => {
    await seedProducts(30);

    const response = await request(app).get('/products?page=2&pageSize=10');

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(2);
    expect(response.body.pageSize).toBe(10);
    expect(response.body.total).toBe(30);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.data[0].productId).toBe(11);
  });

  it('caps oversize pageSize at 100', async () => {
    await seedProducts(120);

    const response = await request(app).get('/products?pageSize=999');

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(100);
    expect(response.body.total).toBe(120);
    expect(response.body.data).toHaveLength(100);
  });

  it('returns empty data when page has no results', async () => {
    const response = await request(app).get('/products?page=2&pageSize=20');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      page: 2,
      pageSize: 20,
      total: 0,
    });
  });
});
