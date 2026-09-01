-- Execute este script no SQL Editor do seu Supabase para aplicar as alterações.

-- 1. Adicionar coluna 'altura' na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS altura numeric;

-- 2. Criar a tabela 'weight_history'
CREATE TABLE IF NOT EXISTS public.weight_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    peso numeric not null,
    data timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- 3. Configurar permissões e RLS para a nova tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_history TO authenticated;
GRANT ALL ON public.weight_history TO service_role;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- 4. Criar política para o usuário gerenciar seu próprio histórico
CREATE POLICY "own weight history all" ON public.weight_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Opcional: Se quiser que o histórico seja acessível pelos administradores
CREATE POLICY "admins read all weight history" ON public.weight_history FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
