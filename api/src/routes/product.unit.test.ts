import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter from './product';
import { errorHandler, NotFoundError, DatabaseError } from '../utils/errors';

// Mock the products repository module
vi.mock('../repositories/productsRepo', () => ({
  getProductsRepository: vi.fn(),
}));

import { getProductsRepository } from '../repositories/productsRepo';

const mockRepo = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  findBySupplierId: vi.fn(),
};

let app: express.Express;

describe('Product Route unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getProductsRepository as any).mockResolvedValue(mockRepo);

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  // ── POST / ──────────────────────────────────────────────────────────────────

  describe('POST /', () => {
    it('should return 201 and the created product', async () => {
      const created = { productId: 1, supplierId: 1, name: 'Widget', sku: 'W-001', price: 5.0, unit: 'piece', imgName: 'w.png', description: '', discount: 0 };
      mockRepo.create.mockResolvedValue(created);

      const response = await request(app)
        .post('/products')
        .send({ supplierId: 1, name: 'Widget', sku: 'W-001', price: 5.0, unit: 'piece', imgName: 'w.png', description: '' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ productId: 1, name: 'Widget' });
    });

    it('should propagate unexpected errors from repo.create', async () => {
      mockRepo.create.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app)
        .post('/products')
        .send({ supplierId: 1, name: 'Widget' });

      expect(response.status).toBe(500);
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return 200 with all products', async () => {
      mockRepo.findAll.mockResolvedValue([{ productId: 1, name: 'Widget' }]);

      const response = await request(app).get('/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 200 with empty array when no products exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const response = await request(app).get('/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should propagate unexpected errors from repo.findAll', async () => {
      mockRepo.findAll.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).get('/products');

      expect(response.status).toBe(500);
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────────

  describe('GET /:id', () => {
    it('should return 200 with the product when found', async () => {
      mockRepo.findById.mockResolvedValue({ productId: 42, name: 'Widget' });

      const response = await request(app).get('/products/42');

      expect(response.status).toBe(200);
      expect(response.body.productId).toBe(42);
    });

    it('should return 404 when product is not found (repo returns null)', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const response = await request(app).get('/products/999');

      expect(response.status).toBe(404);
    });

    it('should propagate unexpected errors from repo.findById', async () => {
      mockRepo.findById.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).get('/products/1');

      expect(response.status).toBe(500);
    });
  });

  // ── GET /name/:name ──────────────────────────────────────────────────────────

  describe('GET /name/:name', () => {
    it('should return 200 with matching products array', async () => {
      mockRepo.findByName.mockResolvedValue([{ productId: 1, name: 'Widget A' }]);

      const response = await request(app).get('/products/name/Widget');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].name).toBe('Widget A');
    });

    it('should return 200 with empty array when no products match', async () => {
      // findByName always returns an array; even an empty array is truthy,
      // so the route responds 200 rather than 404 for no-results
      mockRepo.findByName.mockResolvedValue([]);

      const response = await request(app).get('/products/name/NoMatch');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 404 when repo returns a falsy value', async () => {
      // Exercises the else branch: `if (product) { ... } else { 404 }`
      mockRepo.findByName.mockResolvedValue(null);

      const response = await request(app).get('/products/name/NoMatch');

      expect(response.status).toBe(404);
    });

    it('should propagate unexpected errors from repo.findByName', async () => {
      mockRepo.findByName.mockRejectedValue(new DatabaseError('DB failure'));

      const response = await request(app).get('/products/name/fail');

      expect(response.status).toBe(500);
    });
  });

  // ── PUT /:id ─────────────────────────────────────────────────────────────────

  describe('PUT /:id', () => {
    it('should return 200 with the updated product', async () => {
      mockRepo.update.mockResolvedValue({ productId: 1, name: 'Updated Widget' });

      const response = await request(app).put('/products/1').send({ name: 'Updated Widget' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Widget');
    });

    it('should return 404 when repo.update throws NotFoundError', async () => {
      mockRepo.update.mockRejectedValue(new NotFoundError('Product', 999));

      const response = await request(app).put('/products/999').send({ name: 'Ghost' });

      expect(response.status).toBe(404);
    });

    it('should propagate non-NotFoundError from repo.update via next(error)', async () => {
      mockRepo.update.mockRejectedValue(new DatabaseError('Connection lost'));

      const response = await request(app).put('/products/1').send({ name: 'Fail' });

      expect(response.status).toBe(500);
    });
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────────

  describe('DELETE /:id', () => {
    it('should return 204 on successful deletion', async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      const response = await request(app).delete('/products/1');

      expect(response.status).toBe(204);
    });

    it('should return 404 when repo.delete throws NotFoundError', async () => {
      mockRepo.delete.mockRejectedValue(new NotFoundError('Product', 999));

      const response = await request(app).delete('/products/999');

      expect(response.status).toBe(404);
    });

    it('should propagate non-NotFoundError from repo.delete via next(error)', async () => {
      mockRepo.delete.mockRejectedValue(new DatabaseError('Disk full'));

      const response = await request(app).delete('/products/1');

      expect(response.status).toBe(500);
    });
  });
});
