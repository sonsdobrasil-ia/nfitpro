
-- Move has_role to a private schema not exposed via PostgREST,
-- preventing signed-in users from invoking it as an RPC while
-- keeping it usable inside RLS policies.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate policies to reference private.has_role
DROP POLICY IF EXISTS "admins see all roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins see all roles" ON public.user_roles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth read published" ON public.ebooks;
DROP POLICY IF EXISTS "admins manage ebooks" ON public.ebooks;
CREATE POLICY "auth read published" ON public.ebooks FOR SELECT TO authenticated USING (publicado = true OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage ebooks" ON public.ebooks FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all workout_logs" ON public.workout_logs;
CREATE POLICY "admins read all workout_logs" ON public.workout_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all ebook_progress" ON public.ebook_progress;
CREATE POLICY "admins read all ebook_progress" ON public.ebook_progress FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- Storage policies
DROP POLICY IF EXISTS "admins upload ebook covers" ON storage.objects;
DROP POLICY IF EXISTS "admins update ebook covers" ON storage.objects;
DROP POLICY IF EXISTS "admins delete ebook covers" ON storage.objects;
CREATE POLICY "admins upload ebook covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ebook-covers' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update ebook covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ebook-covers' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete ebook covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ebook-covers' AND private.has_role(auth.uid(), 'admin'));

-- Remove the exposed public.has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
