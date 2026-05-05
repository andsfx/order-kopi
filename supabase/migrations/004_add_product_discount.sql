-- ============================================
-- MIGRATION: Add Discount to Products
-- ============================================
-- Adds discount_percent column to products table.
-- discount_percent: 0-100, null or 0 = no discount.
--
-- Date: 2026-05-05
-- ============================================

alter table products
  add column if not exists discount_percent int check (discount_percent >= 0 and discount_percent <= 100);
