import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsRepository } from './productsRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      db: {} as any,
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };

    (getDatabase as any).mockResolvedValue(mockDb);
    repository = new ProductsRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const mockRows = [
        {
          product_id: 1,
          supplier_id: 1,
          name: 'Widget',
          description: 'A widget',
          price: 9.99,
          sku: 'WGT-001',
          unit: 'piece',
          img_name: 'w.png',
          discount: 0,
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM products ORDER BY product_id');
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(1);
      expect(result[0].name).toBe('Widget');
    });

    it('should return empty array when no products exist', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      const mockRow = {
        product_id: 1,
        supplier_id: 1,
        name: 'Widget',
        description: 'A widget',
        price: 9.99,
        sku: 'WGT-001',
        unit: 'piece',
        img_name: 'w.png',
        discount: 0,
      };
      mockDb.get.mockResolvedValue(mockRow);

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE product_id = ?',
        [1],
      );
      expect(result?.productId).toBe(1);
      expect(result?.name).toBe('Widget');
    });

    it('should return null when product not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new product and return it', async () => {
      const newProduct = {
        supplierId: 1,
        name: 'New Widget',
        description: 'Brand new',
        price: 19.99,
        sku: 'WGT-NEW',
        unit: 'box',
        imgName: 'new.png',
        discount: 0,
      };

      mockDb.run.mockResolvedValue({ lastID: 2, changes: 1 });
      mockDb.get.mockResolvedValue({
        product_id: 2,
        supplier_id: 1,
        name: 'New Widget',
        description: 'Brand new',
        price: 19.99,
        sku: 'WGT-NEW',
        unit: 'box',
        img_name: 'new.png',
        discount: 0,
      });

      const result = await repository.create(newProduct);

      expect(mockDb.run).toHaveBeenCalled();
      expect(result.productId).toBe(2);
      expect(result.name).toBe('New Widget');
    });
  });

  describe('update', () => {
    it('should update existing product and return updated data', async () => {
      const updateData = { name: 'Updated Widget' };

      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({
        product_id: 1,
        supplier_id: 1,
        name: 'Updated Widget',
        description: 'A widget',
        price: 9.99,
        sku: 'WGT-001',
        unit: 'piece',
        img_name: 'w.png',
        discount: 0,
      });

      const result = await repository.update(1, updateData);

      expect(result.name).toBe('Updated Widget');
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { name: 'Ghost' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete existing product', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM products WHERE product_id = ?',
        [1],
      );
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when product exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM products WHERE product_id = ?',
        [1],
      );
    });

    it('should return false when product does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findBySupplierId', () => {
    it('should return products for a given supplier', async () => {
      const mockRows = [
        {
          product_id: 1,
          supplier_id: 1,
          name: 'Widget',
          description: 'A widget',
          price: 9.99,
          sku: 'WGT-001',
          unit: 'piece',
          img_name: 'w.png',
          discount: 0,
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findBySupplierId(1);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE supplier_id = ? ORDER BY name',
        [1],
      );
      expect(result).toHaveLength(1);
      expect(result[0].supplierId).toBe(1);
    });

    it('should return empty array when no products for supplier', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findBySupplierId(999);

      expect(result).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should return products matching name pattern', async () => {
      const mockRows = [
        {
          product_id: 1,
          supplier_id: 1,
          name: 'Widget A',
          description: 'First widget',
          price: 9.99,
          sku: 'WGT-001',
          unit: 'piece',
          img_name: 'w.png',
          discount: 0,
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findByName('Widget');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Widget A');
    });

    it('should return empty array when no matching products', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findByName('NonExistent');

      expect(result).toEqual([]);
    });
  });
});
