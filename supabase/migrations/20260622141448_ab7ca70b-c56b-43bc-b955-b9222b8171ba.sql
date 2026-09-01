
CREATE POLICY "auth view ebook covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ebook-covers');
CREATE POLICY "admins upload ebook covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update ebook covers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete ebook covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-covers' AND public.has_role(auth.uid(), 'admin'));
