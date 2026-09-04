import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PDF_BUCKET = "ebook-pdfs";
const COVER_BUCKET = "ebook-covers";
const HTML_BUCKET = "ebook-html";

async function assertAdmin(context: any) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Apenas administradores podem gerenciar arquivos.");
}

/** Usa a chave de serviço quando existir; senão cai para o cliente do próprio admin. */
async function storageClient(context: any) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return context.supabase;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function split(path: string) {
  const i = path.lastIndexOf("/");
  return { folder: i > 0 ? path.slice(0, i) : "", name: i > 0 ? path.slice(i + 1) : path };
}

/** Verifica com privilégios de servidor se o arquivo existe no bucket. */
export const checkStorageFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ bucket: z.enum([PDF_BUCKET, COVER_BUCKET, HTML_BUCKET]), path: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabaseAdmin = await storageClient(context);
    const { folder, name } = split(data.path);
    const { data: files, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .list(folder, { search: name, limit: 100 });
    if (error) throw new Error(error.message);
    return { exists: (files ?? []).some((f: { name: string }) => f.name === name) };
  });

/** Remove arquivos com privilégios de servidor (ignora RLS do storage). */
export const removeStorageFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pdf: z.string().nullable().optional(),
        cover: z.string().nullable().optional(),
        html: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabaseAdmin = await storageClient(context);
    const isPath = (v?: string | null) => !!v && !/^https?:\/\//i.test(v);
    const errors: string[] = [];

    if (isPath(data.pdf)) {
      const { error } = await supabaseAdmin.storage.from(PDF_BUCKET).remove([data.pdf!]);
      if (error) errors.push(`PDF: ${error.message}`);
    }
    if (isPath(data.cover)) {
      const { error } = await supabaseAdmin.storage.from(COVER_BUCKET).remove([data.cover!]);
      if (error) errors.push(`Capa: ${error.message}`);
    }
    const htmlPaths = (data.html ?? []).filter(isPath);
    if (htmlPaths.length) {
      const { error } = await supabaseAdmin.storage.from(HTML_BUCKET).remove(htmlPaths);
      if (error) errors.push(`HTML: ${error.message}`);
    }
    return { ok: errors.length === 0, errors };
  });
