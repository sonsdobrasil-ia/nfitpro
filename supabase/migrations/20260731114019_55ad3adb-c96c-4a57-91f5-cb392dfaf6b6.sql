DELETE FROM public.ebooks WHERE pdf_url IS NULL;
ALTER TABLE public.ebooks DROP COLUMN IF EXISTS capitulos;
DROP TABLE IF EXISTS public.ebook_progress;