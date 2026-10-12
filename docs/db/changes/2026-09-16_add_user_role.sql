-- Adds the user role used for the ROLE_USER / ROLE_ADMIN authority.
-- Before this, "admin" was only a hardcoded email check in the app, and every
-- logged-in user could call the ban, flag and admin-list endpoints.
--
-- Apply once to the shared database. Existing accounts become USER.
-- Always write public.users: Supabase also has its own auth.users table, which also has a role column.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Grant the existing admin account the ADMIN role
UPDATE public.users SET role = 'ADMIN' WHERE lower(email) = 'admin@gmail.com';

-- Check: should list admin@gmail.com as ADMIN and everyone else as USER
-- SELECT userid, email, role FROM public.users ORDER BY role, userid;

-- Undo:
-- ALTER TABLE public.users DROP COLUMN role;
