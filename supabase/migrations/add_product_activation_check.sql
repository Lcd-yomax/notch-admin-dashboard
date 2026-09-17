-- ============================================================
-- BLOCK PRODUCT ACTIVATION WITHOUT PHOTOS OR PRICES
-- ============================================================
-- Run this once in your Supabase → SQL Editor
--
-- A product cannot become active (is_active = true) when:
--   - it has no product_images row           -> "Photos manquantes"
--   - an active variation has price <= 0      -> "Prix manquant : 256 Go · 8 Go · Noir"
--
-- Only the switch to active is checked (INSERT with is_active = true, or
-- UPDATE from inactive to active): products that are already active are
-- not affected. Enforced for every client (dashboard, SQL editor, API).
-- ============================================================

CREATE OR REPLACE FUNCTION public.products_check_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  missing text[] := '{}';
  v record;
  label text;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = NEW.id) THEN
    missing := array_append(missing, 'Photos manquantes');
  END IF;

  FOR v IN
    SELECT sku, storage_gb, ram_gb, color, size
    FROM public.product_variations
    WHERE product_id = NEW.id
      AND is_active
      AND price <= 0
    ORDER BY storage_gb NULLS LAST, ram_gb NULLS LAST, color NULLS LAST, sku
  LOOP
    label := concat_ws(' · ',
      CASE
        WHEN v.storage_gb IS NULL THEN NULL
        WHEN v.storage_gb >= 1024 AND v.storage_gb % 1024 = 0 THEN (v.storage_gb / 1024)::text || ' To'
        ELSE v.storage_gb::text || ' Go'
      END,
      CASE WHEN v.ram_gb IS NULL THEN NULL ELSE v.ram_gb::text || ' Go' END,
      NULLIF(btrim(v.color), ''),
      CASE WHEN v.storage_gb IS NULL AND v.ram_gb IS NULL THEN NULLIF(btrim(v.size), '') END
    );
    IF label IS NULL OR label = '' THEN
      label := v.sku;
    END IF;
    missing := array_append(missing, 'Prix manquant : ' || label);
  END LOOP;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'Activation impossible : ' || array_to_string(missing, ' ; ');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_check_activation ON public.products;

CREATE TRIGGER products_check_activation
  BEFORE INSERT OR UPDATE OF is_active ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_check_activation();
