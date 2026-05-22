-- Migration 003: Add stock_level field to products table

ALTER TABLE products ADD COLUMN stock_level INTEGER DEFAULT NULL;
