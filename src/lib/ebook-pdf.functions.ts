import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Retorna o PDF de um eBook conforme a permissão do usuário:
 * - admin ou assinante ativo: URL assinada do arquivo completo
 * - demais usuários: prévia gratuita (primeiras páginas) gerada no servidor
 */
export const getEbookPdfAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ebookId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: ebook, error } = await supabase
      .from("ebooks")
      .select("id, pdf_url, publicado")
      .eq("id", data.ebookId)
      .maybeSingle();
    if (error || !ebook || !ebook.pdf_url) {
      throw new Error("eBook indisponível");
    }

    const [{ data: roleRow }, { data: sub }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      supabase
        .from("subscribers")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const isAdmin = !!roleRow;
    const activeSub =
      sub?.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    const entitled = isAdmin || activeSub;

    const path = ebook.pdf_url;
    const isRemote = /^https?:\/\//i.test(path);

    // Cliente admin é necessário apenas para a prévia gratuita (download server-side).
    const loadAdmin = async () => {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return supabaseAdmin;
      } catch {
        throw new Error(
          "Backend sem configuração: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.",
        );
      }
    };

    if (entitled) {
      if (isRemote) return { mode: "full" as const, url: path };
      // Usa o cliente do próprio usuário (RLS libera admin/assinante ativo)
      const { data: signed, error: signErr } = await supabase.storage
        .from("ebook-pdfs")
        .createSignedUrl(path, 60 * 60 * 6);
      if (signErr || !signed) {
        throw new Error(`Não foi possível abrir o PDF: ${signErr?.message ?? "sem URL assinada"}`);
      }
      return { mode: "full" as const, url: signed.signedUrl };
    }

    // Prévia gratuita: baixa o PDF no servidor e devolve apenas as primeiras páginas
    let bytes: Uint8Array;
    if (isRemote) {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Não foi possível baixar o PDF (HTTP ${res.status})`);
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      const admin = await loadAdmin();
      const { data: file, error: dlErr } = await admin.storage.from("ebook-pdfs").download(path);
      if (dlErr || !file) {
        throw new Error(`Não foi possível abrir a prévia: ${dlErr?.message ?? "arquivo não encontrado"}`);
      }
      bytes = new Uint8Array(await file.arrayBuffer());
    }


    const { PDFDocument } = await import("pdf-lib");
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = src.getPageCount();
    const allowed = Math.max(3, Math.min(10, Math.round(totalPages * 0.1)));
    const count = Math.min(allowed, totalPages);

    const out = await PDFDocument.create();
    const pages = await out.copyPages(
      src,
      Array.from({ length: count }, (_, i) => i),
    );
    pages.forEach((p) => out.addPage(p));
    const previewBytes = await out.save();
    const base64 = Buffer.from(previewBytes).toString("base64");

    return {
      mode: "preview" as const,
      url: `data:application/pdf;base64,${base64}`,
      previewPages: count,
      totalPages,
    };
  });
