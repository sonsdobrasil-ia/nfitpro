GRANT SELECT ON public.ebooks TO anon;

CREATE POLICY "anon read published ebooks"
ON public.ebooks FOR SELECT TO anon
USING (publicado = true);

CREATE POLICY "anon view ebook covers"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'ebook-covers');