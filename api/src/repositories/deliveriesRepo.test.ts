import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveriesRepository } from './deliveriesRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('DeliveriesRepository', () => {
  let repository: DeliveriesRepository;
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
    repository = new DeliveriesRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all deliveries', async () => {
      const mockRows = [
        {
          delivery_id: 1,
          supplier_id: 1,
          delivery_date: '2024-01-10',
          name: 'First Shipment',
          description: 'Initial delivery',
          status: 'pending',
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries ORDER BY delivery_id',
      );
      expect(result).toHaveLength(1);
      expect(result[0].deliveryId).toBe(1);
      expect(result[0].name).toBe('First Shipment');
    });

    it('should return empty array when no deliveries exist', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return delivery when found', async () => {
      const mockRow = {
        delivery_id: 1,
        supplier_id: 1,
        delivery_date: '2024-01-10',
        name: 'First Shipment',
        description: 'Initial delivery',
        status: 'pending',
      };
      mockDb.get.mockResolvedValue(mockRow);

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE delivery_id = ?',
        [1],
      );
      expect(result?.deliveryId).toBe(1);
      expect(result?.name).toBe('First Shipment');
    });

    it('should return null when delivery not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new delivery and return it', async () => {
      const newDelivery = {
        supplierId: 1,
        deliveryDate: '2024-05-01',
        name: 'New Shipment',
        description: 'New delivery',
        status: 'pending',
      };

      mockDb.run.mockResolvedValue({ lastID: 2, changes: 1 });
      mockDb.get.mockResolvedValue({
        delivery_id: 2,
        supplier_id: 1,
        delivery_date: '2024-05-01',
        name: 'New Shipment',
        description: 'New delivery',
        status: 'pending',
      });

      const result = await repository.create(newDelivery);

      expect(mockDb.run).toHaveBeenCalled();
      expect(result.deliveryId).toBe(2);
      expect(result.name).toBe('New Shipment');
    });
  });

  describe('update', () => {
    it('should update existing delivery and return updated data', async () => {
      const updateData = { status: 'in-transit' };

      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({
        delivery_id: 1,
        supplier_id: 1,
        delivery_date: '2024-01-10',
        name: 'First Shipment',
        description: 'Initial delivery',
        status: 'in-transit',
      });

      const result = await repository.update(1, updateData);

      expect(result.status).toBe('in-transit');
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { status: 'delivered' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('delete', () => {
    it('should delete existing delivery', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM deliveries WHERE delivery_id = ?',
        [1],
      );
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when delivery exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM deliveries WHERE delivery_id = ?',
        [1],
      );
    });

    it('should return false when delivery does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findBySupplierId', () => {
    it('should return deliveries for a given supplier', async () => {
      const mockRows = [
        {
          delivery_id: 1,
          supplier_id: 1,
          delivery_date: '2024-01-10',
          name: 'Supplier Delivery',
          description: 'From supplier 1',
          status: 'delivered',
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findBySupplierId(1);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE supplier_id = ? ORDER BY delivery_date DESC',
        [1],
      );
      expect(result).toHaveLength(1);
      expect(result[0].supplierId).toBe(1);
    });

    it('should return empty array when no deliveries for supplier', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findBySupplierId(999);

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return deliveries with a given status', async () => {
      const mockRows = [
        {
          delivery_id: 1,
          supplier_id: 1,
          delivery_date: '2024-01-10',
          name: 'In-Transit Delivery',
          description: 'On the way',
          status: 'in-transit',
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findByStatus('in-transit');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE status = ? ORDER BY delivery_date DESC',
        ['in-transit'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('in-transit');
    });

    it('should return empty array when no deliveries with given status', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findByStatus('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findByDateRange', () => {
    it('should return deliveries within a date range', async () => {
      const mockRows = [
        {
          delivery_id: 1,
          supplier_id: 1,
          delivery_date: '2024-07-15',
          name: 'July Delivery',
          description: 'Summer delivery',
          status: 'delivered',
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findByDateRange('2024-07-01', '2024-07-31');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE delivery_date >= ? AND delivery_date <= ? ORDER BY delivery_date DESC',
        ['2024-07-01', '2024-07-31'],
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no deliveries in date range', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findByDateRange('2020-01-01', '2020-01-31');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update delivery status and return updated delivery', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({
        delivery_id: 1,
        supplier_id: 1,
        delivery_date: '2024-01-10',
        name: 'First Shipment',
        description: 'Initial delivery',
        status: 'delivered',
      });

      const result = await repository.updateStatus(1, 'delivered');

      expect(result.status).toBe('delivered');
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.updateStatus(999, 'delivered')).rejects.toThrow(NotFoundError);
    });
  });
});
