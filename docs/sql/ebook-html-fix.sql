-- Execute este SQL no painel do Supabase (SQL Editor) do projeto conectado.
-- Corrige o suporte à leitura em HTML dos eBooks.
-- A migração anterior (20260901200000) usava "CREATE POLICY IF NOT EXISTS",
-- sintaxe inválida no Postgres, e não criava o bucket de armazenamento.

-- 1) Coluna para o HTML de prévia (primeiras páginas)
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS html_preview_url TEXT;

-- 2) Bucket privado para os arquivos HTML
INSERT INTO storage.buckets (id, name, public)
VALUES ('ebook-html', 'ebook-html', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3) Políticas de acesso (sintaxe válida)
DROP POLICY IF EXISTS "auth read ebook html" ON storage.objects;
DROP POLICY IF EXISTS "admins upload ebook html" ON storage.objects;
DROP POLICY IF EXISTS "admins update ebook html" ON storage.objects;
DROP POLICY IF EXISTS "admins delete ebook html" ON storage.objects;
DROP POLICY IF EXISTS "entitled users view ebook html" ON storage.objects;
DROP POLICY IF EXISTS "auth view ebook html preview" ON storage.objects;

-- Prévia: qualquer usuário autenticado pode ler (arquivos *-preview.html)
CREATE POLICY "auth view ebook html preview" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ebook-html' AND name LIKE '%-preview.html');

-- HTML completo: apenas admin ou assinante ativo
CREATE POLICY "entitled users view ebook html" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ebook-html'
    AND (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.subscribers s
        WHERE s.user_id = auth.uid()
          AND s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
      )
    )
  );

CREATE POLICY "admins upload ebook html" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-html' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update ebook html" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-html' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete ebook html" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-html' AND private.has_role(auth.uid(), 'admin'));
