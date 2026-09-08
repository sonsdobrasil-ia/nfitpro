import { supabase } from "@/integrations/supabase/client";
import { checkStorageFile, removeStorageFiles, signStorageUrl } from "./ebook-storage.functions";

const BUCKET = "ebook-pdfs";
const HTML_BUCKET = "ebook-html";
const cache = new Map<string, { url: string; expires: number }>();
const uploadedPdfUrls = new Map<string, string>();
// Um upload concluído com sucesso é a confirmação mais confiável imediata.
// O endpoint de listagem do Storage pode demorar a refletir o novo objeto ou
// ocultá-lo por política, produzindo um falso "não encontrado".
const uploadedPdfPaths = new Set<string>();

export async function resolvePdfUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const path = normalizeStoragePath(value);
  const uploadedUrl = uploadedPdfUrls.get(path);
  if (uploadedUrl) return uploadedUrl;
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (!error && data) {
    cache.set(path, { url: data.signedUrl, expires: Date.now() + 1000 * 60 * 60 * 5 });
    return data.signedUrl;
  }
  // As policies do storage podem bloquear a assinatura no cliente; tenta no servidor.
  try {
    const res = await signStorageUrl({ data: { bucket: BUCKET, path } });
    cache.set(path, { url: res.url, expires: Date.now() + 1000 * 60 * 60 * 5 });
    return res.url;
  } catch (e) {
    console.warn("[ebook-files] falha ao assinar PDF", path, error?.message, e);
    return null;
  }
}

function normalizeStoragePath(value: string): string {
  const decoded = decodeURIComponent(value).replace(/^\/+/, "");
  const bucketMarker = `${BUCKET}/`;
  const bucketIndex = decoded.indexOf(bucketMarker);
  return bucketIndex >= 0 ? decoded.slice(bucketIndex + bucketMarker.length) : decoded;
}

export async function uploadPdf(file: File): Promise<string> {
  const path = `pdfs/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(`Falha ao enviar o PDF: ${error.message}`);
  uploadedPdfPaths.add(path);
  uploadedPdfUrls.set(path, URL.createObjectURL(file));
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
  const path = normalizeStoragePath(value);
  if (uploadedPdfPaths.has(path)) return true;
  const slash = path.lastIndexOf("/");
  const folder = slash > 0 ? path.slice(0, slash) : "";
  const name = slash > 0 ? path.slice(slash + 1) : path;
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: name,
    limit: 100,
  });
  if (!error && (data ?? []).some((f) => f.name === name)) return true;
  try {
    const res = await checkStorageFile({ data: { bucket: BUCKET, path } });
    return !!res.exists;
  } catch {
    return false;
  }
}

export async function deletePdf(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  const path = normalizeStoragePath(value);
  // Feito no servidor: o remove() do cliente pode ser silenciosamente
  // bloqueado pelas policies de storage e não apagar nada.
  await removeStorageFiles({ data: { pdf: path } });
  uploadedPdfPaths.delete(path);
  const uploadedUrl = uploadedPdfUrls.get(path);
  if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
  uploadedPdfUrls.delete(path);
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
