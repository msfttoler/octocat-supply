/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API endpoints for managing products
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Returns paginated products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 total:
 *                   type: integer
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */

import express from 'express';
import { Product } from '../models/product';
import { getProductsRepository } from '../repositories/productsRepo';
import { NotFoundError } from '../utils/errors';

const router = express.Router();
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePaginationParams(query: Record<string, unknown>): { page: number; pageSize: number } {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const requestedPageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  return { page, pageSize };
}

// Create a new product
router.post('/', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const newProduct = await repo.create(req.body as Omit<Product, 'productId'>);
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
});

// Get paginated products
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = parsePaginationParams(req.query as Record<string, unknown>);

    const repo = await getProductsRepository();
    const total = await repo.count();
    const offset = (page - 1) * pageSize;
    const data = await repo.findPaginated(offset, pageSize);

    res.json({ data, page, pageSize, total });
  } catch (error) {
    next(error);
  }
});

// Get a product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const product = await repo.findById(parseInt(req.params.id));
    if (product) {
      res.json(product);
    } else {
      res.status(404).send('Product not found');
    }
  } catch (error) {
    next(error);
  }
});

// Get a product by name
router.get('/name/:name', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const product = await repo.findByName(req.params.name);
    if (product) {
      res.json(product);
    } else {
      res.status(404).send('Product not found');
    }
  } catch (error) {
    next(error);
  }
});

// Update a product by ID
router.put('/:id', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const updatedProduct = await repo.update(parseInt(req.params.id), req.body);
    res.json(updatedProduct);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).send('Product not found');
    } else {
      next(error);
    }
  }
});

// Delete a product by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    await repo.delete(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).send('Product not found');
    } else {
      next(error);
    }
  }
});

export default router;
