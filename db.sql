-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  group text NOT NULL,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);
CREATE TABLE public.dashboard_users (
  id uuid NOT NULL,
  role_id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dashboard_users_pkey PRIMARY KEY (id),
  CONSTRAINT dashboard_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT dashboard_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  brand_id uuid,
  hide_price boolean NOT NULL DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.product_variations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku text NOT NULL UNIQUE,
  color text,
  size text,
  price numeric NOT NULL,
  price_display numeric,
  discount_label text,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  storage_gb integer,
  ram_gb integer,
  condition text NOT NULL DEFAULT 'neuf'::text CHECK (condition = ANY (ARRAY['neuf'::text, 'reconditionne'::text, 'occasion'::text])),
  warranty_months integer DEFAULT 12,
  CONSTRAINT product_variations_pkey PRIMARY KEY (id),
  CONSTRAINT product_variations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variation_id uuid,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_images_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.product_variations(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL DEFAULT ('ORD-'::text || upper(substr((gen_random_uuid())::text, 1, 8))) UNIQUE,
  full_name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  phone text,
  email text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::order_status,
  total_amount numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  assigned_to uuid,
  delivery_status USER-DEFINED,
  confirmation_status USER-DEFINED DEFAULT 'pending'::confirmation_status_enum,
  code_suivi text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  click_id text,
  referrer text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.dashboard_users(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  variation_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.product_variations(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  image_url text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid,
  title text NOT NULL,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.dashboard_users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  old_value text,
  new_value text,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_activity_pkey PRIMARY KEY (id),
  CONSTRAINT order_activity_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.dashboard_users(id)
);
CREATE TABLE public.brands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brands_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_specs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  group_name text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  label_ar text,
  value_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT product_specs_pkey PRIMARY KEY (id),
  CONSTRAINT product_specs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.device_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variation_id uuid NOT NULL,
  imei text NOT NULL UNIQUE CHECK (imei ~ '^[0-9]{15}$'::text),
  imei2 text UNIQUE CHECK (imei2 IS NULL OR imei2 ~ '^[0-9]{15}$'::text),
  status text NOT NULL DEFAULT 'in_stock'::text CHECK (status = ANY (ARRAY['in_stock'::text, 'sold'::text, 'returned'::text, 'defective'::text])),
  order_item_id uuid,
  purchase_price numeric,
  supplier text,
  received_at timestamp with time zone DEFAULT now(),
  sold_at timestamp with time zone,
  CONSTRAINT device_units_pkey PRIMARY KEY (id),
  CONSTRAINT device_units_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.product_variations(id),
  CONSTRAINT device_units_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id)
);
