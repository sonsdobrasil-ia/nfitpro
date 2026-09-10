import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getEbookPdfAccess } from "@/lib/ebook-pdf.functions";
import { resolveHtmlUrl } from "@/lib/ebook-html";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { useHasAccess } from "@/components/SubscriptionGate";
import { previewPages } from "@/lib/plans";
import { useSubscription } from "@/lib/use-subscription";

export const Route = createFileRoute("/_authenticated/ebook/$id")({
  component: Reader,
});

type EbookRow = {
  id: string;
  titulo: string;
  pdf_url: string | null;
  html_url: string | null;
  html_preview_url: string | null;
  paginas: number | null;
};

function Reader() {
  const { id } = Route.useParams();
  const { hasAccess, loading: loadingAccess } = useHasAccess();
  const { plano } = useSubscription();
  const [ebook, setEbook] = useState<EbookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [htmlPage, setHtmlPage] = useState(1);
  const [htmlTotal, setHtmlTotal] = useState(0);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);
  const userId = useRef<string | null>(null);
  const fetchPdfAccess = useServerFn(getEbookPdfAccess);

  const canDownloadPdf = hasAccess && plano === "anual";

  useEffect(() => {
    if (loadingAccess) return;
    let alive = true;
    let objectUrl: string | null = null;
    (async () => {
      setLoading(true);
      setErro(null);
      const { data: u } = await supabase.auth.getUser();
      userId.current = u.user?.id ?? null;

      const { data, error } = await supabase
        .from("ebooks")
        .select("id, titulo, pdf_url, html_url, html_preview_url, paginas")
        .eq("id", id)
        .maybeSingle();

      if (!alive) return;
      if (error || !data) {
        setLoading(false);
        setErro("eBook não encontrado.");
        return toast.error("eBook não encontrado");
      }

      const row = data as any as EbookRow;
      setEbook(row);

      // A leitura usa somente o HTML completo — o PDF não é mais carregado aqui.
      const isFull = true;
      const htmlPath = row.html_url ?? row.html_preview_url;

      if (!htmlPath) {
        setLoading(false);
        setErro("A versão de leitura deste eBook ainda não foi gerada.");
        return;
      }

      const signed = await resolveHtmlUrl(htmlPath);
      if (!alive) return;
      if (!signed) {
        setLoading(false);
        setErro("Não foi possível abrir o arquivo de leitura.");
        return;
      }

      // O storage pode servir o arquivo como texto puro (o navegador mostraria
      // o código). Baixamos e recriamos como documento HTML.
      try {
        const res = await fetch(signed);
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        if (!alive) return;
        objectUrl = URL.createObjectURL(new Blob([text], { type: "text/html;charset=utf-8" }));
        setHtmlUrl(objectUrl);
      } catch {
        if (!alive) return;
        setHtmlUrl(signed);
      }

      void isFull;
      setHtmlTotal(row.paginas ?? 0);
      setLoading(false);
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, hasAccess, loadingAccess]);

  // Page messages from the reader iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "ebook-page") {
        setHtmlPage(e.data.page ?? 1);
        setHtmlTotal((t) => e.data.total ?? t);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Persist progress
  useEffect(() => {
    if (!userId.current || !ebook || htmlTotal <= 0) return;
    const t = setTimeout(() => {
      const percentual = Math.round((htmlPage / htmlTotal) * 100);
      supabase
        .from("ebook_reading_progress")
        .upsert(
          {
            user_id: userId.current!,
            ebook_id: ebook.id,
            pagina_atual: htmlPage,
            total_paginas: htmlTotal,
            percentual,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id,ebook_id" },
        )
        .then(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [htmlPage, htmlTotal, ebook]);

  const percent = htmlTotal ? Math.round((htmlPage / htmlTotal) * 100) : 0;

  const handleDownloadPdf = async () => {
    let url = pdfSignedUrl;
    if (!url) {
      try {
        const access = await fetchPdfAccess({ data: { ebookId: id } });
        url = access.url;
        setPdfSignedUrl(access.url);
      } catch (e: any) {
        console.error("[ebook] download do PDF falhou", e);
        return toast.error("PDF não disponível para download");
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ebook?.titulo ?? "ebook"}.pdf`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Barra superior mínima — mais compacta em mobile */}
      <header className="flex items-center gap-2 px-3 h-11 sm:h-12 shrink-0 border-b bg-background/95 backdrop-blur">
        <Link to="/ebook" className="p-2 -ml-2 rounded-full hover:bg-muted" aria-label="Voltar">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-semibold text-sm truncate flex-1">{ebook?.titulo ?? "Leitura"}</h1>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {htmlTotal ? `${htmlPage}/${htmlTotal}` : ""}
        </span>
        {canDownloadPdf && !!ebook?.pdf_url && (
          <button
            onClick={handleDownloadPdf}
            title="Baixar PDF (plano Anual)"
            className="p-2 rounded-full text-primary hover:bg-primary/10 shrink-0"
            aria-label="Baixar PDF"
          >
            <Download className="size-4" />
          </button>
        )}
      </header>


      {/* Progresso fino */}
      <div className="h-0.5 bg-muted shrink-0">
        <div className="h-full bg-gradient-energy transition-all" style={{ width: `${percent}%` }} />
      </div>

      {/* Leitura */}
      <div className="flex-1 min-h-0">
        {loading || loadingAccess ? (
          <div className="size-full grid place-items-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : erro ? (
          <div className="size-full grid place-items-center px-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{erro}</p>
              <Link
                to="/ebook"
                className="mt-4 inline-flex rounded-2xl bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm"
              >
                Voltar para a biblioteca
              </Link>
            </div>
          </div>
        ) : (
          <iframe
            src={htmlUrl!}
            title={ebook?.titulo ?? "eBook"}
            className="size-full border-0 bg-card"
            sandbox="allow-scripts allow-same-origin"
            loading="eager"
          />
        )}
      </div>
    </div>
  );
}
