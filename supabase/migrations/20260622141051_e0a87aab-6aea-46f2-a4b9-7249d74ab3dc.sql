
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admins see all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Promote current user
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role FROM public.profiles WHERE email = 'REDACTED_ADMIN_EMAIL'
ON CONFLICT DO NOTHING;

-- Ebooks (products)
CREATE TABLE public.ebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  descricao text,
  autor text,
  capa_url text,
  preco numeric(10,2) DEFAULT 0,
  publicado boolean NOT NULL DEFAULT true,
  capitulos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO service_role;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read published" ON public.ebooks FOR SELECT TO authenticated
  USING (publicado = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage ebooks" ON public.ebooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER ebooks_touch BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Admin visibility over other users' data
CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read all workout_logs" ON public.workout_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read all ebook_progress" ON public.ebook_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed one ebook from existing static content placeholder
INSERT INTO public.ebooks (titulo, subtitulo, descricao, autor, preco, publicado, capitulos)
VALUES (
  'Do Sofá aos 5km',
  'Guia FitPower para iniciantes',
  'Plano completo de 30 dias para sair do sofá e correr 5km com segurança.',
  'FitPower',
  0,
  true,
  '[]'::jsonb
);
