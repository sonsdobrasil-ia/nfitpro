INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email = 'REDACTED_ADMIN_EMAIL'
ON CONFLICT DO NOTHING;

-- Fallback: if still no admin, promote the oldest existing user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;