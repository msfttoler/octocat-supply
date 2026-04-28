import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HeadquartersRepository } from './headquartersRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('HeadquartersRepository', () => {
  let repository: HeadquartersRepository;
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
    repository = new HeadquartersRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all headquarters', async () => {
      const mockRows = [
        {
          headquarters_id: 1,
          name: 'HQ One',
          description: 'Main HQ',
          address: '1 Main St',
          contact_person: 'CEO',
          email: 'ceo@hq.com',
          phone: '555-0001',
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM headquarters ORDER BY headquarters_id',
      );
      expect(result).toHaveLength(1);
      expect(result[0].headquartersId).toBe(1);
      expect(result[0].name).toBe('HQ One');
    });

    it('should return empty array when no headquarters exist', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return headquarters when found', async () => {
      const mockRow = {
        headquarters_id: 1,
        name: 'HQ One',
        description: 'Main HQ',
        address: '1 Main St',
        contact_person: 'CEO',
        email: 'ceo@hq.com',
        phone: '555-0001',
      };
      mockDb.get.mockResolvedValue(mockRow);

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM headquarters WHERE headquarters_id = ?',
        [1],
      );
      expect(result?.headquartersId).toBe(1);
      expect(result?.name).toBe('HQ One');
    });

    it('should return null when headquarters not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new headquarters and return it', async () => {
      const newHQ = {
        name: 'New HQ',
        description: 'A new office',
        address: '42 Office Park',
        contactPerson: 'Director',
        email: 'dir@new.com',
        phone: '555-9000',
      };

      mockDb.run.mockResolvedValue({ lastID: 2, changes: 1 });
      mockDb.get.mockResolvedValue({
        headquarters_id: 2,
        name: 'New HQ',
        description: 'A new office',
        address: '42 Office Park',
        contact_person: 'Director',
        email: 'dir@new.com',
        phone: '555-9000',
      });

      const result = await repository.create(newHQ);

      expect(mockDb.run).toHaveBeenCalled();
      expect(result.headquartersId).toBe(2);
      expect(result.name).toBe('New HQ');
    });
  });

  describe('update', () => {
    it('should update existing headquarters and return updated data', async () => {
      const updateData = { name: 'Updated HQ' };

      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({
        headquarters_id: 1,
        name: 'Updated HQ',
        description: 'Main HQ',
        address: '1 Main St',
        contact_person: 'CEO',
        email: 'ceo@hq.com',
        phone: '555-0001',
      });

      const result = await repository.update(1, updateData);

      expect(result.name).toBe('Updated HQ');
    });

    it('should throw NotFoundError when headquarters does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { name: 'Ghost HQ' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete existing headquarters', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM headquarters WHERE headquarters_id = ?',
        [1],
      );
    });

    it('should throw NotFoundError when headquarters does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when headquarters exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM headquarters WHERE headquarters_id = ?',
        [1],
      );
    });

    it('should return false when headquarters does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findByName', () => {
    it('should return headquarters matching name pattern', async () => {
      const mockRows = [
        {
          headquarters_id: 1,
          name: 'East HQ',
          description: 'Eastern office',
          address: '10 East Ave',
          contact_person: 'VP',
          email: 'vp@east.com',
          phone: '555-1111',
        },
      ];
      mockDb.all.mockResolvedValue(mockRows);

      const result = await repository.findByName('East');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM headquarters WHERE name LIKE ? ORDER BY name',
        ['%East%'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('East HQ');
    });

    it('should return empty array when no matching headquarters', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findByName('Nonexistent');

      expect(result).toEqual([]);
    });
  });
});
