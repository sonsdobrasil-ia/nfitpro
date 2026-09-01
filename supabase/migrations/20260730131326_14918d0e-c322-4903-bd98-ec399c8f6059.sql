ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS paginas INTEGER,
  ADD COLUMN IF NOT EXISTS categoria TEXT;

CREATE TABLE IF NOT EXISTS public.ebook_reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  pagina_atual INTEGER NOT NULL DEFAULT 1,
  total_paginas INTEGER NOT NULL DEFAULT 1,
  percentual NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ebook_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebook_reading_progress TO authenticated;
GRANT ALL ON public.ebook_reading_progress TO service_role;

ALTER TABLE public.ebook_reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own reading progress" ON public.ebook_reading_progress;
CREATE POLICY "users manage own reading progress" ON public.ebook_reading_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth view ebook pdfs" ON storage.objects;
CREATE POLICY "auth view ebook pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ebook-pdfs');
DROP POLICY IF EXISTS "admins upload ebook pdfs" ON storage.objects;
CREATE POLICY "admins upload ebook pdfs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-pdfs' AND private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins update ebook pdfs" ON storage.objects;
CREATE POLICY "admins update ebook pdfs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-pdfs' AND private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete ebook pdfs" ON storage.objects;
CREATE POLICY "admins delete ebook pdfs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-pdfs' AND private.has_role(auth.uid(), 'admin'));