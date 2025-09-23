-- 20250921_backfill_admins_from_user_roles.sql
-- Idempotent backfill: create admins rows for all user_roles with role = 'admin' when an admins row does not already exist.
-- Safe to run multiple times.

INSERT INTO public.admins (school_id, auth_user_id, name, email, phone)
SELECT ur.school_id,
       ur.user_id,
       COALESCE(u.raw_user_meta->>'full_name', u.email, 'Admin')::text,
       u.email,
       NULL
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.admins a WHERE a.auth_user_id = ur.user_id
  );

-- Optionally, return number of affected rows (depends on client). SELECT count(*) FROM public.admins;