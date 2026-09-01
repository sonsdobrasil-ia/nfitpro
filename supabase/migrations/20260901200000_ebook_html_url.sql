-- Add html_url column to ebooks for storing the generated HTML reader path
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS html_url TEXT;

-- Storage bucket policies for ebook-html
-- (The bucket itself must be created manually in the Supabase Dashboard:
--  Name: ebook-html, Public: false)

-- Allow authenticated users to read HTML files (for the reader)
CREATE POLICY IF NOT EXISTS "auth read ebook html" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ebook-html');

-- Allow admins to upload HTML files
CREATE POLICY IF NOT EXISTS "admins upload ebook html" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-html' AND private.has_role(auth.uid(), 'admin'));

-- Allow admins to update HTML files
CREATE POLICY IF NOT EXISTS "admins update ebook html" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-html' AND private.has_role(auth.uid(), 'admin'));

-- Allow admins to delete HTML files
CREATE POLICY IF NOT EXISTS "admins delete ebook html" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-html' AND private.has_role(auth.uid(), 'admin'));
