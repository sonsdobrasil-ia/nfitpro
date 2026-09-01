import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

export async function resolveCoverUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const cached = cache.get(value);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from("ebook-covers").createSignedUrl(value, 60 * 60 * 24 * 7);
  if (error || !data) return null;
  cache.set(value, { url: data.signedUrl, expires: Date.now() + 1000 * 60 * 60 * 24 * 6 });
  return data.signedUrl;
}

export async function uploadCover(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `covers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("ebook-covers").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteCover(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  await supabase.storage.from("ebook-covers").remove([value]);
}
