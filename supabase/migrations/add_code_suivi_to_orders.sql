-- ============================================================
-- ADD code_suivi COLUMN TO orders TABLE
-- ============================================================
-- Run this once in your Supabase → SQL Editor
-- code_suivi = shipping/tracking code from the carrier
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS code_suivi TEXT DEFAULT NULL;

-- Optional: add a comment for documentation
COMMENT ON COLUMN orders.code_suivi IS 'Carrier tracking code / numéro de suivi colis';
