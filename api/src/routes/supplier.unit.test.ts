import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import supplierRouter from './supplier';
import { errorHandler, NotFoundError, DatabaseError } from '../utils/errors';

// Mock the suppliers repository module
vi.mock('../repositories/suppliersRepo', () => ({
  getSuppliersRepository: vi.fn(),
}));

import { getSuppliersRepository } from '../repositories/suppliersRepo';

const mockRepo = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
};

let app: express.Express;

describe('Supplier Route unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSuppliersRepository as any).mockResolvedValue(mockRepo);

    app = express();
    app.use(express.json());
    app.use('/suppliers', supplierRouter);
    app.use(errorHandler);
  });

  // ── POST / ──────────────────────────────────────────────────────────────────

  describe('POST /', () => {
    it('should return 201 and the created supplier', async () => {
      const created = { supplierId: 1, name: 'Acme', description: '', contactPerson: 'Alice', email: 'a@acme.com', phone: '555-0001', active: true, verified: false };
      mockRepo.create.mockResolvedValue(created);

      const response = await request(app)
        .post('/suppliers')
        .send({ name: 'Acme', contactPerson: 'Alice', email: 'a@acme.com', phone: '555-0001', active: true, verified: false });

      expect(response.status).toBe(201);
      expect(response.body.supplierId).toBe(1);
      expect(response.body.name).toBe('Acme');
    });

    it('should propagate unexpected errors from repo.create', async () => {
      mockRepo.create.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).post('/suppliers').send({ name: 'Fail' });

      expect(response.status).toBe(500);
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return 200 with all suppliers', async () => {
      mockRepo.findAll.mockResolvedValue([{ supplierId: 1, name: 'Acme' }]);

      const response = await request(app).get('/suppliers');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 200 with empty array when no suppliers exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const response = await request(app).get('/suppliers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should propagate unexpected errors from repo.findAll', async () => {
      mockRepo.findAll.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).get('/suppliers');

      expect(response.status).toBe(500);
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────────

  describe('GET /:id', () => {
    it('should return 200 with the supplier when found', async () => {
      mockRepo.findById.mockResolvedValue({ supplierId: 7, name: 'Beta', active: true, verified: false });

      const response = await request(app).get('/suppliers/7');

      expect(response.status).toBe(200);
      expect(response.body.supplierId).toBe(7);
    });

    it('should return 404 when supplier is not found (repo returns null)', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const response = await request(app).get('/suppliers/999');

      expect(response.status).toBe(404);
    });

    it('should propagate unexpected errors from repo.findById', async () => {
      mockRepo.findById.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).get('/suppliers/1');

      expect(response.status).toBe(500);
    });
  });

  // ── PUT /:id ─────────────────────────────────────────────────────────────────

  describe('PUT /:id', () => {
    it('should return 200 with the updated supplier', async () => {
      mockRepo.update.mockResolvedValue({ supplierId: 1, name: 'Updated', active: true, verified: true });

      const response = await request(app).put('/suppliers/1').send({ name: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated');
    });

    it('should return 404 when repo.update throws NotFoundError', async () => {
      mockRepo.update.mockRejectedValue(new NotFoundError('Supplier', 999));

      const response = await request(app).put('/suppliers/999').send({ name: 'Ghost' });

      expect(response.status).toBe(404);
    });

    it('should propagate non-NotFoundError from repo.update via next(error)', async () => {
      mockRepo.update.mockRejectedValue(new DatabaseError('Connection lost'));

      const response = await request(app).put('/suppliers/1').send({ name: 'Fail' });

      expect(response.status).toBe(500);
    });
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────────

  describe('DELETE /:id', () => {
    it('should return 204 on successful deletion', async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      const response = await request(app).delete('/suppliers/1');

      expect(response.status).toBe(204);
    });

    it('should return 404 when repo.delete throws NotFoundError', async () => {
      mockRepo.delete.mockRejectedValue(new NotFoundError('Supplier', 999));

      const response = await request(app).delete('/suppliers/999');

      expect(response.status).toBe(404);
    });

    it('should propagate non-NotFoundError from repo.delete via next(error)', async () => {
      mockRepo.delete.mockRejectedValue(new DatabaseError('Disk full'));

      const response = await request(app).delete('/suppliers/1');

      expect(response.status).toBe(500);
    });
  });

  // ── GET /:id/status ───────────────────────────────────────────────────────────

  describe('GET /:id/status', () => {
    it('should return 200 with status for an active supplier', async () => {
      mockRepo.findById.mockResolvedValue({ supplierId: 1, name: 'Active', active: true, verified: true });

      const response = await request(app).get('/suppliers/1/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('APPROVED');
    });

    it('should return APPROVED for inactive supplier (documents current bug)', async () => {
      // NOTE: Due to misleading indentation in processSupplierStatus, `return 'APPROVED'`
      // runs unconditionally regardless of supplier.active. The INACTIVE/PENDING branches
      // are dead code. This test documents the current (buggy) behavior.
      mockRepo.findById.mockResolvedValue({ supplierId: 2, name: 'Inactive', active: false, verified: false });

      const response = await request(app).get('/suppliers/2/status');

      expect(response.status).toBe(200);
      // The indentation bug causes APPROVED to always be returned
      expect(response.body.status).toBe('APPROVED');
    });

    it('should return APPROVED for inactive verified supplier (documents bug)', async () => {
      // The `return 'APPROVED'` is not inside the `if (supplier.active)` block,
      // so it always executes before reaching the `return 'PENDING'` branch.
      mockRepo.findById.mockResolvedValue({ supplierId: 3, name: 'Inactive Verified', active: false, verified: true });

      const response = await request(app).get('/suppliers/3/status');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('APPROVED');
    });

    it('should return 404 when supplier is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const response = await request(app).get('/suppliers/999/status');

      expect(response.status).toBe(404);
    });

    it('should propagate unexpected errors from repo.findById in status route', async () => {
      mockRepo.findById.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).get('/suppliers/1/status');

      expect(response.status).toBe(500);
    });
  });
});
