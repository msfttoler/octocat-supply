import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import deliveryRouter from './delivery';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Delivery API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required foreign key: supplier id 1
    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [
      1,
      'Test Supplier',
    ]);

    app = express();
    app.use(express.json());
    app.use('/deliveries', deliveryRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should create a new delivery', async () => {
    const newDelivery = {
      supplierId: 1,
      deliveryDate: '2024-01-20',
      name: 'First Delivery',
      description: 'Initial shipment',
      status: 'pending',
    };
    const response = await request(app).post('/deliveries').send(newDelivery);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'First Delivery' });
    expect(response.body.deliveryId).toBeDefined();
  });

  it('should get all deliveries', async () => {
    const response = await request(app).get('/deliveries');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get a delivery by ID', async () => {
    const newDelivery = {
      supplierId: 1,
      deliveryDate: '2024-02-10',
      name: 'Second Delivery',
      description: 'Second shipment',
      status: 'in-transit',
    };
    const createResponse = await request(app).post('/deliveries').send(newDelivery);
    const deliveryId = createResponse.body.deliveryId;

    const response = await request(app).get(`/deliveries/${deliveryId}`);
    expect(response.status).toBe(200);
    expect(response.body.deliveryId).toBe(deliveryId);
  });

  it('should update a delivery by ID', async () => {
    const newDelivery = {
      supplierId: 1,
      deliveryDate: '2024-03-05',
      name: 'Update Me Delivery',
      description: 'To be updated',
      status: 'pending',
    };
    const createResponse = await request(app).post('/deliveries').send(newDelivery);
    const deliveryId = createResponse.body.deliveryId;

    const response = await request(app)
      .put(`/deliveries/${deliveryId}`)
      .send({ status: 'delivered' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('delivered');
  });

  it('should update delivery status', async () => {
    const newDelivery = {
      supplierId: 1,
      deliveryDate: '2024-04-01',
      name: 'Status Update Delivery',
      description: 'Status test',
      status: 'pending',
    };
    const createResponse = await request(app).post('/deliveries').send(newDelivery);
    const deliveryId = createResponse.body.deliveryId;

    const response = await request(app)
      .put(`/deliveries/${deliveryId}/status`)
      .send({ status: 'in-transit' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('in-transit');
  });

  it('should delete a delivery by ID', async () => {
    const newDelivery = {
      supplierId: 1,
      deliveryDate: '2024-05-01',
      name: 'Delete Me Delivery',
      description: 'Will be deleted',
      status: 'failed',
    };
    const createResponse = await request(app).post('/deliveries').send(newDelivery);
    const deliveryId = createResponse.body.deliveryId;

    const response = await request(app).delete(`/deliveries/${deliveryId}`);
    expect(response.status).toBe(204);
  });

  it('should return 404 for a non-existing delivery', async () => {
    const response = await request(app).get('/deliveries/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 when updating a non-existing delivery', async () => {
    const response = await request(app).put('/deliveries/999').send({ status: 'delivered' });
    expect(response.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing delivery', async () => {
    const response = await request(app).delete('/deliveries/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 when updating status of a non-existing delivery', async () => {
    const response = await request(app)
      .put('/deliveries/999/status')
      .send({ status: 'delivered' });
    expect(response.status).toBe(404);
  });
});
