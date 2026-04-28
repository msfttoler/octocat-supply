import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import supplierRouter from './supplier';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Supplier API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    app = express();
    app.use(express.json());
    app.use('/suppliers', supplierRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should create a new supplier', async () => {
    const newSupplier = {
      name: 'Acme Corp',
      description: 'A reliable supplier',
      contactPerson: 'John Smith',
      email: 'jsmith@acme.com',
      phone: '555-1234',
      active: true,
      verified: true,
    };
    const response = await request(app).post('/suppliers').send(newSupplier);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Acme Corp' });
    expect(response.body.supplierId).toBeDefined();
  });

  it('should get all suppliers', async () => {
    const response = await request(app).get('/suppliers');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get a supplier by ID', async () => {
    const newSupplier = {
      name: 'Beta Supplies',
      description: 'Beta supplier',
      contactPerson: 'Jane Doe',
      email: 'jane@beta.com',
      phone: '555-5678',
      active: true,
      verified: false,
    };
    const createResponse = await request(app).post('/suppliers').send(newSupplier);
    const supplierId = createResponse.body.supplierId;

    const response = await request(app).get(`/suppliers/${supplierId}`);
    expect(response.status).toBe(200);
    expect(response.body.supplierId).toBe(supplierId);
  });

  it('should update a supplier by ID', async () => {
    const newSupplier = {
      name: 'Original Supplier',
      description: 'To be updated',
      contactPerson: 'Bob',
      email: 'bob@original.com',
      phone: '555-0001',
      active: true,
      verified: true,
    };
    const createResponse = await request(app).post('/suppliers').send(newSupplier);
    const supplierId = createResponse.body.supplierId;

    const response = await request(app)
      .put(`/suppliers/${supplierId}`)
      .send({ name: 'Updated Supplier' });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Supplier');
  });

  it('should delete a supplier by ID', async () => {
    const newSupplier = {
      name: 'Delete Me Supplier',
      description: 'Will be deleted',
      contactPerson: 'Alice',
      email: 'alice@del.com',
      phone: '555-9999',
      active: false,
      verified: false,
    };
    const createResponse = await request(app).post('/suppliers').send(newSupplier);
    const supplierId = createResponse.body.supplierId;

    const response = await request(app).delete(`/suppliers/${supplierId}`);
    expect(response.status).toBe(204);
  });

  it('should get supplier status for an active supplier', async () => {
    const newSupplier = {
      name: 'Active Supplier',
      description: 'Active and verified',
      contactPerson: 'Carol',
      email: 'carol@active.com',
      phone: '555-2222',
      active: true,
      verified: true,
    };
    const createResponse = await request(app).post('/suppliers').send(newSupplier);
    const supplierId = createResponse.body.supplierId;

    const response = await request(app).get(`/suppliers/${supplierId}/status`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(typeof response.body.status).toBe('string');
  });

  it('should return 404 when getting a non-existing supplier', async () => {
    const response = await request(app).get('/suppliers/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 when updating a non-existing supplier', async () => {
    const response = await request(app).put('/suppliers/999').send({ name: 'Ghost' });
    expect(response.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing supplier', async () => {
    const response = await request(app).delete('/suppliers/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 for status of a non-existing supplier', async () => {
    const response = await request(app).get('/suppliers/999/status');
    expect(response.status).toBe(404);
  });
});
