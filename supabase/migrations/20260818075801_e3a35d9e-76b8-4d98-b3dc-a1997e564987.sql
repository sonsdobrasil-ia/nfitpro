-- Plans sold via Cakto
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  preco numeric NOT NULL DEFAULT 0,
  intervalo text NOT NULL DEFAULT 'mensal',
  provider text NOT NULL DEFAULT 'cakto',
  cakto_offer_id text,
  checkout_url text,
  destaque boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read active plans" ON public.plans FOR SELECT TO anon USING (ativo = true);
CREATE POLICY "auth read plans" ON public.plans FOR SELECT TO authenticated USING (ativo = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage plans" ON public.plans FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.plans (nome, slug, descricao, preco, intervalo, destaque, ordem)
VALUES
  ('Mensal', 'mensal', 'Cancele quando quiser.', 9.90, 'mensal', false, 1),
  ('Anual', 'anual', 'Equivale a R$ 8,25/mês — 2 meses grátis.', 99.00, 'anual', true, 2);

-- Generic provider columns on subscribers
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'cakto',
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_user_id_key ON public.subscribers (user_id);
CREATE INDEX IF NOT EXISTS subscribers_email_idx ON public.subscribers (lower(email));

-- Raw webhook log (admin-only reads)
CREATE TABLE public.payment_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'cakto',
  event_type text,
  external_id text,
  email text,
  status text,
  processed boolean NOT NULL DEFAULT false,
  error text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read webhook events" ON public.payment_webhook_events FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));