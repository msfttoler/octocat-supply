import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import headquartersRouter from './headquarters';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Headquarters API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    app = express();
    app.use(express.json());
    app.use('/headquarters', headquartersRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should create a new headquarters', async () => {
    const newHQ = {
      name: 'Global HQ',
      description: 'Main headquarters',
      address: '100 Corporate Ave',
      contactPerson: 'CEO',
      email: 'ceo@corp.com',
      phone: '555-0100',
    };
    const response = await request(app).post('/headquarters').send(newHQ);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Global HQ' });
    expect(response.body.headquartersId).toBeDefined();
  });

  it('should get all headquarters', async () => {
    const response = await request(app).get('/headquarters');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get a headquarters by ID', async () => {
    const newHQ = {
      name: 'East HQ',
      description: 'Eastern headquarters',
      address: '200 East Blvd',
      contactPerson: 'VP East',
      email: 'east@corp.com',
      phone: '555-0200',
    };
    const createResponse = await request(app).post('/headquarters').send(newHQ);
    const headquartersId = createResponse.body.headquartersId;

    const response = await request(app).get(`/headquarters/${headquartersId}`);
    expect(response.status).toBe(200);
    expect(response.body.headquartersId).toBe(headquartersId);
  });

  it('should update a headquarters by ID', async () => {
    const newHQ = {
      name: 'West HQ',
      description: 'Western headquarters',
      address: '300 West St',
      contactPerson: 'VP West',
      email: 'west@corp.com',
      phone: '555-0300',
    };
    const createResponse = await request(app).post('/headquarters').send(newHQ);
    const headquartersId = createResponse.body.headquartersId;

    const response = await request(app)
      .put(`/headquarters/${headquartersId}`)
      .send({ name: 'Updated West HQ', address: '300 West St' });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated West HQ');
  });

  it('should delete a headquarters by ID', async () => {
    const newHQ = {
      name: 'Delete HQ',
      description: 'Will be deleted',
      address: '999 Gone Rd',
      contactPerson: 'Former VP',
      email: 'del@corp.com',
      phone: '555-9999',
    };
    const createResponse = await request(app).post('/headquarters').send(newHQ);
    const headquartersId = createResponse.body.headquartersId;

    const response = await request(app).delete(`/headquarters/${headquartersId}`);
    expect(response.status).toBe(204);
  });

  it('should get headquarters metrics by ID', async () => {
    const newHQ = {
      name: 'Metrics HQ',
      description: 'For metrics testing',
      address: '50 Metrics Ln',
      contactPerson: 'Analyst',
      email: 'analyst@corp.com',
      phone: '555-0050',
    };
    const createResponse = await request(app).post('/headquarters').send(newHQ);
    const headquartersId = createResponse.body.headquartersId;

    const response = await request(app).get(`/headquarters/${headquartersId}/metrics`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('score');
    expect(response.body).toHaveProperty('average');
    expect(response.body).toHaveProperty('display');
  });

  it('should get headquarters label by ID', async () => {
    const newHQ = {
      name: 'Label HQ',
      description: 'For label testing',
      address: '75 Label Ave',
      contactPerson: 'Manager',
      email: 'mgr@corp.com',
      phone: '555-0075',
    };
    const createResponse = await request(app).post('/headquarters').send(newHQ);
    const headquartersId = createResponse.body.headquartersId;

    const response = await request(app).get(`/headquarters/${headquartersId}/label`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('label');
    expect(typeof response.body.label).toBe('string');
  });

  it('should return 404 for a non-existing headquarters', async () => {
    const response = await request(app).get('/headquarters/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing headquarters', async () => {
    const response = await request(app).delete('/headquarters/999');
    expect(response.status).toBe(404);
  });

  it('should return 404 for metrics of a non-existing headquarters', async () => {
    const response = await request(app).get('/headquarters/999/metrics');
    expect(response.status).toBe(404);
  });

  it('should return 404 for label of a non-existing headquarters', async () => {
    const response = await request(app).get('/headquarters/999/label');
    expect(response.status).toBe(404);
  });
});
