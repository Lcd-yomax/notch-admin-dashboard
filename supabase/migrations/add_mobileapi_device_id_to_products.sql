-- ============================================================
-- ADD mobileapi_device_id COLUMN TO products TABLE
-- ============================================================
-- Run this once in your Supabase → SQL Editor
-- mobileapi_device_id = device id on api.mobileapi.dev, used by
-- "Mettre à jour depuis MobileAPI" to skip the search call.
-- Dashboard only: never expose it in storefront views.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS mobileapi_device_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.products.mobileapi_device_id IS 'MobileAPI.dev device id (dashboard import only)';
