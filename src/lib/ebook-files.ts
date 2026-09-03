import { supabase } from "@/integrations/supabase/client";
import { checkStorageFile, removeStorageFiles } from "./ebook-storage.functions";

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
  if (error) throw new Error(`Falha ao enviar o PDF: ${error.message}`);
  const ok = await pdfExists(path);
  if (!ok) throw new Error("O PDF foi enviado, mas não foi encontrado no armazenamento.");
  return path;
}

/**
 * Verifica se o arquivo realmente existe no bucket de PDFs.
 * O `list()` do cliente depende das policies de storage e pode retornar vazio
 * mesmo com o arquivo presente — por isso confirmamos no servidor.
 */
export async function pdfExists(value: string | null | undefined): Promise<boolean> {
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  const slash = value.lastIndexOf("/");
  const folder = slash > 0 ? value.slice(0, slash) : "";
  const name = slash > 0 ? value.slice(slash + 1) : value;
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: name,
    limit: 100,
  });
  if (!error && (data ?? []).some((f) => f.name === name)) return true;
  try {
    const res = await checkStorageFile({ data: { bucket: BUCKET, path: value } });
    return !!res.exists;
  } catch {
    return false;
  }
}

export async function deletePdf(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  // Feito no servidor: o remove() do cliente pode ser silenciosamente
  // bloqueado pelas policies de storage e não apagar nada.
  await removeStorageFiles({ data: { pdf: value } });
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
