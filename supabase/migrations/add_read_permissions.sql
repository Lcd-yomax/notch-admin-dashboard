-- ============================================================
-- ADD MISSING READ PERMISSIONS + reports:read
-- ============================================================
-- Run once in Supabase → SQL Editor
-- Adds all read-level permissions that the sidebar references,
-- then assigns every new permission to the super_admin role.
-- ============================================================

-- 1. Insert the missing permissions (skip if already exists)
INSERT INTO public.permissions (key, label, group, description)
VALUES
  ('products:read',       'View Products',       'products',       'Access the products and categories pages')         ,
  ('reviews:read',        'View Reviews',        'reviews',        'Access the reviews page')                          ,
  ('users:read',          'View Users',          'users',          'Access the users management page')                 ,
  ('announcements:read',  'View Announcements',  'announcements',  'Access the announcements page')                    ,
  ('reports:read',        'View Reports',        'reports',        'Access the reports / analytics page')
ON CONFLICT (key) DO NOTHING;

-- 2. Grant all new permissions to the super_admin role automatically
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
  AND p.key IN (
    'products:read',
    'reviews:read',
    'users:read',
    'announcements:read',
    'reports:read'
  )
ON CONFLICT DO NOTHING;
