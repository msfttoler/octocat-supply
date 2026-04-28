import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderRouter from './order';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Order API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required foreign keys: headquarters and branch
    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [
      1,
      'Test HQ',
    ]);
    await db.run(
      'INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)',
      [1, 1, 'Test Branch'],
    );

    app = express();
    app.use(express.json());
    app.use('/orders', orderRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should create a new order', async () => {
    const newOrder = {
      branchId: 1,
      orderDate: '2024-01-15',
      name: 'Office Supplies Order',
      description: 'Monthly office supplies',
      status: 'pending',
    };
    const response = await request(app).post('/orders').send(newOrder);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Office Supplies Order' });
    expect(response.body.orderId).toBeDefined();
  });

  it('should get all orders', async () => {
    const response = await request(app).get('/orders');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get an order by ID', async () => {
    const newOrder = {
      branchId: 1,
      orderDate: '2024-02-01',
      name: 'Equipment Order',
      description: 'New equipment',
      status: 'processing',
    };
    const createResponse = await request(app).post('/orders').send(newOrder);
    const orderId = createResponse.body.orderId;

    const response = await request(app).get(`/orders/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.body.orderId).toBe(orderId);
  });

  it('should update an order by ID', async () => {
    const newOrder = {
      branchId: 1,
      orderDate: '2024-03-01',
      name: 'Original Order',
      description: 'To be updated',
      status: 'pending',
    };
    const createResponse = await request(app).post('/orders').send(newOrder);
    const orderId = createResponse.body.orderId;

    const response = await request(app)
      .put(`/orders/${orderId}`)
      .send({ status: 'shipped' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('shipped');
  });

  it('should delete an order by ID', async () => {
    const newOrder = {
      branchId: 1,
      orderDate: '2024-04-01',
      name: 'Delete Me Order',
      description: 'Will be deleted',
      status: 'cancelled',
    };
    const createResponse = await request(app).post('/orders').send(newOrder);
    const orderId = createResponse.body.orderId;

    const response = await request(app).delete(`/orders/${orderId}`);
    expect(response.status).toBe(204);
  });

  it('should return 404 for a non-existing order', async () => {
    const response = await request(app).get('/orders/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 when updating a non-existing order', async () => {
    const response = await request(app).put('/orders/999').send({ status: 'delivered' });
    expect(response.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing order', async () => {
    const response = await request(app).delete('/orders/999');
    expect(response.status).toBe(404);
  });
});
