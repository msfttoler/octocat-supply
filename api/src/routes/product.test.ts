import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter from './product';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Product API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required foreign key: supplier id 1
    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Test Supplier']);

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should create a new product', async () => {
    const newProduct = {
      supplierId: 1,
      name: 'Widget A',
      description: 'A test widget',
      price: 9.99,
      sku: 'WGT-001',
      unit: 'piece',
      imgName: 'widget-a.png',
      discount: 0,
    };
    const response = await request(app).post('/products').send(newProduct);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Widget A', sku: 'WGT-001' });
    expect(response.body.productId).toBeDefined();
  });

  it('should get all products', async () => {
    const response = await request(app).get('/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get a product by ID', async () => {
    const newProduct = {
      supplierId: 1,
      name: 'Widget B',
      description: 'Another widget',
      price: 14.99,
      sku: 'WGT-002',
      unit: 'piece',
      imgName: 'widget-b.png',
    };
    const createResponse = await request(app).post('/products').send(newProduct);
    const productId = createResponse.body.productId;

    const response = await request(app).get(`/products/${productId}`);
    expect(response.status).toBe(200);
    expect(response.body.productId).toBe(productId);
  });

  it('should get products by name', async () => {
    const newProduct = {
      supplierId: 1,
      name: 'Unique Widget',
      description: 'Searchable widget',
      price: 19.99,
      sku: 'WGT-003',
      unit: 'box',
      imgName: 'unique.png',
    };
    await request(app).post('/products').send(newProduct);

    const response = await request(app).get('/products/name/Unique');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].name).toContain('Unique');
  });

  it('should update a product by ID', async () => {
    const newProduct = {
      supplierId: 1,
      name: 'Original Widget',
      description: 'To be updated',
      price: 5.0,
      sku: 'WGT-004',
      unit: 'unit',
      imgName: 'orig.png',
    };
    const createResponse = await request(app).post('/products').send(newProduct);
    const productId = createResponse.body.productId;

    const response = await request(app)
      .put(`/products/${productId}`)
      .send({ name: 'Updated Widget' });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Widget');
  });

  it('should delete a product by ID', async () => {
    const newProduct = {
      supplierId: 1,
      name: 'Delete Me Widget',
      description: 'Will be deleted',
      price: 1.0,
      sku: 'WGT-005',
      unit: 'unit',
      imgName: 'del.png',
    };
    const createResponse = await request(app).post('/products').send(newProduct);
    const productId = createResponse.body.productId;

    const response = await request(app).delete(`/products/${productId}`);
    expect(response.status).toBe(204);
  });

  it('should return 404 for a non-existing product', async () => {
    const response = await request(app).get('/products/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 when updating a non-existing product', async () => {
    const response = await request(app).put('/products/999').send({ name: 'Ghost' });
    expect(response.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing product', async () => {
    const response = await request(app).delete('/products/999');
    expect(response.status).toBe(404);
  });

  it('should return an empty array for a product name that does not exist', async () => {
    const response = await request(app).get('/products/name/NonExistentProduct');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });
});
