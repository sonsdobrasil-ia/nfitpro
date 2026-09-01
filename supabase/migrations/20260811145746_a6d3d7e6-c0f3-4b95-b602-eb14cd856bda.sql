CREATE TABLE public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plano text CHECK (plano IN ('mensal','anual')),
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscribers TO authenticated;
GRANT ALL ON public.subscribers TO service_role;

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription select" ON public.subscribers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins read all subscriptions" ON public.subscribers
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER subscribers_touch BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX subscribers_status_idx ON public.subscribers (status);