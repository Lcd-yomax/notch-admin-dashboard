-- Add storefront visibility to categories and hide the Diffuseur category.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.categories
SET is_active = false
WHERE slug = 'diffuseur-de-parfum'
   OR lower(name) = 'diffuseur de parfum';

-- Do not leave products from the hidden category in featured/shop listings.
UPDATE public.products
SET is_active = false
WHERE category_id IN (
  SELECT id
  FROM public.categories
  WHERE slug = 'diffuseur-de-parfum'
     OR lower(name) = 'diffuseur de parfum'
);
