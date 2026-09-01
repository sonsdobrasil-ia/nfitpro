/**
 * Template do schema completo do backend FitPower, pronto para ser executado
 * no SQL Editor de um projeto Supabase externo.
 *
 * Mantido à mão a partir do estado atual do banco (sem introspecção em runtime).
 */
export const MIGRATION_SCHEMA_SQL = `-- =====================================================================
-- FitPower — estrutura completa do backend (Supabase / Postgres)
-- Execute este arquivo no SQL Editor do projeto de destino.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Schemas, extensões e tipos
-- ---------------------------------------------------------------------
create schema if not exists private;
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 2. Funções utilitárias
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Tabelas
-- ---------------------------------------------------------------------

-- 3.1 profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text,
  email text,
  peso numeric,
  altura numeric,
  meta text,
  dias_lembrete text[] default array[]::text[],
  horario_lembrete text,
  tema text default 'light',
  onboarding_done boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile delete" on public.profiles for delete to authenticated using (auth.uid() = user_id);

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- 3.2 user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- Verificação de papel (role) em schema privado: não é executável via API.
-- Criada depois de public.user_roles porque funções SQL validam as relações referenciadas.
create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "admins read all profiles" on public.profiles for select to authenticated using (private.has_role(auth.uid(), 'admin'));

create policy "users see own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins see all roles" on public.user_roles for select to authenticated using (private.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

-- 3.3 ebooks
create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  subtitulo text,
  descricao text,
  autor text,
  capa_url text,
  pdf_url text,
  paginas integer,
  categoria text,
  preco numeric default 0,
  publicado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.ebooks to anon;
grant select, insert, update, delete on public.ebooks to authenticated;
grant all on public.ebooks to service_role;
alter table public.ebooks enable row level security;

create policy "anon read published ebooks" on public.ebooks for select to anon using (publicado = true);
create policy "auth read published" on public.ebooks for select to authenticated
  using (publicado = true or private.has_role(auth.uid(), 'admin'));
create policy "admins manage ebooks" on public.ebooks for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

create trigger ebooks_touch before update on public.ebooks
for each row execute function public.touch_updated_at();

-- 3.4 ebook_reading_progress
create table if not exists public.ebook_reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  pagina_atual integer not null default 1,
  total_paginas integer not null default 1,
  percentual numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ebook_id)
);

grant select, insert, update, delete on public.ebook_reading_progress to authenticated;
grant all on public.ebook_reading_progress to service_role;
alter table public.ebook_reading_progress enable row level security;

create policy "users manage own reading progress" on public.ebook_reading_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger ebook_reading_progress_touch before update on public.ebook_reading_progress
for each row execute function public.touch_updated_at();

-- 3.5 workout_logs
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semana integer not null,
  numero_treino integer not null,
  duracao integer not null,
  esforco integer,
  observacao text,
  concluido boolean default true,
  data timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.workout_logs to authenticated;
grant all on public.workout_logs to service_role;
alter table public.workout_logs enable row level security;

create policy "own logs all" on public.workout_logs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins read all workout_logs" on public.workout_logs for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

-- 3.6 plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text,
  preco numeric not null default 0,
  intervalo text not null default 'mensal',
  provider text not null default 'cakto',
  cakto_offer_id text,
  checkout_url text,
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.plans to anon;
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;

create policy "anon read active plans" on public.plans for select to anon using (ativo = true);
create policy "auth read plans" on public.plans for select to authenticated
  using (ativo = true or private.has_role(auth.uid(), 'admin'));
create policy "admins manage plans" on public.plans for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

create trigger plans_touch before update on public.plans
for each row execute function public.touch_updated_at();

-- 3.7 subscribers
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  plano text,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'inactive',
  provider text not null default 'cakto',
  provider_customer_id text,
  provider_subscription_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscribers_user_id_key on public.subscribers(user_id);

-- Escritas apenas via service_role (webhook de pagamento).
grant select on public.subscribers to authenticated;
grant all on public.subscribers to service_role;
alter table public.subscribers enable row level security;

create policy "own subscription select" on public.subscribers for select to authenticated using (auth.uid() = user_id);
create policy "admins read all subscriptions" on public.subscribers for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

create trigger subscribers_touch before update on public.subscribers
for each row execute function public.touch_updated_at();

-- 3.8 payment_webhook_events (auditoria)
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'cakto',
  event_type text,
  external_id text,
  email text,
  status text,
  processed boolean not null default false,
  error text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

grant select on public.payment_webhook_events to authenticated;
grant all on public.payment_webhook_events to service_role;
alter table public.payment_webhook_events enable row level security;

create policy "admins read webhook events" on public.payment_webhook_events for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

-- 3.9 weight_history (evolução de peso e IMC)
create table if not exists public.weight_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  peso numeric not null,
  data timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.weight_history to authenticated;
grant all on public.weight_history to service_role;
alter table public.weight_history enable row level security;

create policy "own weight history all" on public.weight_history for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admins read all weight history" on public.weight_history for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 4. Criação automática de perfil ao cadastrar usuário
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (user_id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Storage: buckets privados e políticas
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ebook-covers', 'ebook-covers', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ebook-pdfs', 'ebook-pdfs', false)
on conflict (id) do nothing;

-- Capas: leitura por qualquer visitante (via URL assinada), escrita só admin.
create policy "covers read" on storage.objects for select
  using (bucket_id = 'ebook-covers');
create policy "covers admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'ebook-covers' and private.has_role(auth.uid(), 'admin'));
create policy "covers admin update" on storage.objects for update to authenticated
  using (bucket_id = 'ebook-covers' and private.has_role(auth.uid(), 'admin'));
create policy "covers admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ebook-covers' and private.has_role(auth.uid(), 'admin'));

-- PDFs: nenhum acesso direto do cliente. O servidor (service_role) assina as URLs
-- somente para admins e assinantes ativos, e gera a prévia gratuita.
create policy "pdfs admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'ebook-pdfs' and private.has_role(auth.uid(), 'admin'));
create policy "pdfs admin update" on storage.objects for update to authenticated
  using (bucket_id = 'ebook-pdfs' and private.has_role(auth.uid(), 'admin'));
create policy "pdfs admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ebook-pdfs' and private.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 6. Após importar os dados, defina o admin do projeto:
--    insert into public.user_roles (user_id, role)
--    values ('<uuid-do-usuario>', 'admin')
--    on conflict do nothing;
-- ---------------------------------------------------------------------
`;

export const MIGRATION_CHECKLIST_MD = `# Checklist de migração — FitPower

## 1. Criar o projeto de destino
- [ ] Criar um novo projeto no Supabase (região próxima do público).
- [ ] Guardar a URL do projeto e a chave publicável (anon).

## 2. Estrutura
- [ ] Abrir o SQL Editor e executar \`schema.sql\` por completo.
- [ ] Conferir em Database > Tables se as 8 tabelas foram criadas.
- [ ] Conferir em Storage se os buckets \`ebook-covers\` e \`ebook-pdfs\` existem e estão privados.

## 3. Arquivos
- [ ] Baixar as capas e os PDFs pela aba Migração.
- [ ] Fazer upload no destino mantendo exatamente os mesmos caminhos (ex.: \`covers/xxxx.png\`).

## 4. Usuários (autenticação)
- [ ] Criar/convidar os usuários no destino (Authentication > Users) — os IDs serão novos.
- [ ] Anotar o mapeamento e-mail → novo UUID.
- [ ] O trigger \`handle_new_user\` cria o perfil automaticamente; ajuste depois os campos extras.

## 5. Dados
- [ ] Executar \`data.sql\` (ou importar os CSVs) na ordem: ebooks, plans, profiles, user_roles, subscribers, workout_logs, ebook_reading_progress, payment_webhook_events, weight_history.
- [ ] Substituir os \`user_id\` antigos pelos novos UUIDs do passo 4.
- [ ] Definir o admin: \`insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');\`

## 6. Ligar o app ao novo backend
- [ ] Atualizar as variáveis de ambiente: URL, chave publicável e chave de serviço.
- [ ] Testar login, dashboard, treinos, leitura de eBook (prévia e completo) e área admin.

## 7. Pagamentos
- [ ] Reapontar o webhook da Cakto para a nova URL do app.
- [ ] Recriar o segredo \`CAKTO_WEBHOOK_SECRET\` no destino com o mesmo valor da Cakto.
- [ ] Fazer uma compra de teste e confirmar a criação do usuário e da assinatura.

## 8. Encerramento
- [ ] Rodar os dois ambientes em paralelo por alguns dias.
- [ ] Só então desativar o ambiente antigo.
`;
