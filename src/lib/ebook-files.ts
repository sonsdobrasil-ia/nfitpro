import { supabase } from "@/integrations/supabase/client";

const BUCKET = "ebook-pdfs";
const HTML_BUCKET = "ebook-html";
const cache = new Map<string, { url: string; expires: number }>();

export async function resolvePdfUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const cached = cache.get(value);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 60 * 60 * 6);
  if (error || !data) return null;
  cache.set(value, { url: data.signedUrl, expires: Date.now() + 1000 * 60 * 60 * 5 });
  return data.signedUrl;
}

export async function uploadPdf(file: File): Promise<string> {
  const path = `pdfs/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deletePdf(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  await supabase.storage.from(BUCKET).remove([value]);
}

export async function uploadHtml(html: string, ebookId: string): Promise<string> {
  const path = `html/${ebookId}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], `${ebookId}.html`, { type: "text/html" });
  await supabase.storage.from(HTML_BUCKET).remove([path]).catch(() => {});
  const { error } = await supabase.storage.from(HTML_BUCKET).upload(path, file, {
    contentType: "text/html",
    upsert: true,
  });
  if (error) throw new Error(`Falha ao salvar o HTML: ${error.message}`);
  return path;
}

export async function deleteHtml(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  await supabase.storage.from(HTML_BUCKET).remove([value]);
}

export const CATEGORIAS = [
  "Corrida",
  "Musculação",
  "Nutrição",
  "Emagrecimento",
  "Mobilidade",
  "Mentalidade",
  "Outros",
] as const;
