DROP POLICY IF EXISTS "auth view ebook pdfs" ON storage.objects;
CREATE POLICY "entitled users view ebook pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ebook-pdfs'
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