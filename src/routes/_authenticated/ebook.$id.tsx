import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getEbookPdfAccess } from "@/lib/ebook-pdf.functions";
import { loadPdf, renderPageToCanvas } from "@/lib/pdf";
import { resolveHtmlUrl } from "@/lib/ebook-html";
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Paywall, useHasAccess } from "@/components/SubscriptionGate";
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
  paginas: number | null;
};

function Reader() {
  const { id } = Route.useParams();
  const { hasAccess, loading: loadingAccess } = useHasAccess();
  const { plano } = useSubscription();
  const [ebook, setEbook] = useState<EbookRow | null>(null);

  // HTML reader state
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [htmlPage, setHtmlPage] = useState(1);
  const [htmlTotal, setHtmlTotal] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // PDF reader state (fallback)
  const [pdf, setPdf] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [flip, setFlip] = useState<{ dir: "next" | "prev"; img: string } | null>(null);
  const images = useRef<Map<number, string>>(new Map());
  const [current, setCurrent] = useState<string | null>(null);
  const userId = useRef<string | null>(null);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);
  const fetchPdfAccess = useServerFn(getEbookPdfAccess);

  /** Whether the user has an annual plan (for PDF download) */
  const canDownloadPdf = hasAccess && plano === "anual";

  const useHtmlReader = !!htmlUrl;

  // Load ebook metadata + either html or pdf
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      userId.current = u.user?.id ?? null;
      const { data, error } = await supabase
        .from("ebooks")
        .select("id, titulo, pdf_url, html_url, paginas")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        if (alive) setLoading(false);
        return toast.error("eBook não encontrado");
      }
      if (!alive) return;
      setEbook(data as any);

      // Try HTML reader first (only for users with full access)
      const ebookData = data as any;

      let access: Awaited<ReturnType<typeof getEbookPdfAccess>>;
      try {
        access = await fetchPdfAccess({ data: { ebookId: id } });
      } catch (e: any) {
        if (alive) setLoading(false);
        console.error("[ebook] falha ao obter PDF", e);
        return toast.error(e?.message ? `PDF indisponível: ${e.message}` : "PDF indisponível");
      }

      // Store the signed PDF URL for potential download
      if (alive) setPdfSignedUrl(access.url);

      // If the ebook has an HTML version and user has full access, use it
      if (ebookData.html_url && access.mode === "full") {
        const signedHtmlUrl = await resolveHtmlUrl(ebookData.html_url);
        if (alive && signedHtmlUrl) {
          setHtmlUrl(signedHtmlUrl);
          setHtmlTotal(ebookData.paginas ?? 0);
          setLoading(false);
          return;
        }
      }

      // Fallback: PDF reader (also used for preview users)
      const doc = await loadPdf(access.url);
      if (!alive) return;
      setPdf(doc);
      setTotal(
        access.mode === "preview"
          ? access.totalPages
          : ((data as any).paginas ?? doc.numPages),
      );

      if (userId.current) {
        const { data: prog } = await supabase
          .from("ebook_reading_progress")
          .select("pagina_atual")
          .eq("user_id", userId.current)
          .eq("ebook_id", id)
          .maybeSingle();
        const p = Math.min(Math.max((prog as any)?.pagina_atual ?? 1, 1), doc.numPages);
        if (alive) {
          setPage(p);
          setMaxPage(p);
        }
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Listen to page change messages from the HTML iframe
  useEffect(() => {
    if (!useHtmlReader) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "ebook-page") {
        setHtmlPage(e.data.page ?? 1);
        setHtmlTotal((t) => e.data.total ?? t);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [useHtmlReader]);

  // Persist HTML reader progress
  useEffect(() => {
    if (!useHtmlReader || !userId.current || !ebook || htmlTotal <= 0) return;
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
  }, [htmlPage, htmlTotal, useHtmlReader, ebook]);

  // PDF reader: render pages
  const renderPage = useCallback(
    async (n: number): Promise<string | null> => {
      if (!pdf || n < 1 || n > pdf.numPages) return null;
      const cached = images.current.get(n);
      if (cached) return cached;
      const canvas = document.createElement("canvas");
      await renderPageToCanvas(pdf, n, canvas, 900);
      const data = canvas.toDataURL("image/jpeg", 0.85);
      images.current.set(n, data);
      return data;
    },
    [pdf],
  );

  useEffect(() => {
    if (!pdf) return;
    let alive = true;
    renderPage(page).then((img) => alive && img && setCurrent(img));
    renderPage(page + 1);
    renderPage(page - 1);
    return () => {
      alive = false;
    };
  }, [pdf, page, renderPage]);

  // PDF reader: persist progress
  useEffect(() => {
    if (!pdf || !userId.current || !ebook) return;
    const t = setTimeout(() => {
      const percentual = Math.round((maxPage / total) * 100);
      supabase
        .from("ebook_reading_progress")
        .upsert(
          {
            user_id: userId.current!,
            ebook_id: ebook.id,
            pagina_atual: page,
            total_paginas: total,
            percentual,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id,ebook_id" },
        )
        .then(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [page, maxPage, total, pdf, ebook]);

  const limitePreview = previewPages(total);
  const limite = hasAccess ? total : Math.min(limitePreview, total || limitePreview);
  const bloqueado = !loadingAccess && !hasAccess && total > 0 && page >= limite;

  useEffect(() => {
    if (loadingAccess || hasAccess || !total) return;
    setPage((p) => (p > limite ? limite : p));
  }, [loadingAccess, hasAccess, total, limite]);

  const go = async (dir: "next" | "prev") => {
    if (flip) return;
    const target = dir === "next" ? page + 1 : page - 1;
    if (target < 1 || target > limite) return;
    const from = current ?? (await renderPage(page));
    if (from) setFlip({ dir, img: dir === "next" ? from : (await renderPage(target)) || from });
    setPage(target);
    setMaxPage((m) => Math.max(m, target));
    setTimeout(() => setFlip(null), 600);
  };

  const touchX = useRef(0);
  const percent = useHtmlReader
    ? (htmlTotal ? Math.round((htmlPage / htmlTotal) * 100) : 0)
    : (total ? Math.round((maxPage / total) * 100) : 0);

  const handleDownloadPdf = () => {
    if (!pdfSignedUrl) return toast.error("PDF não disponível");
    const a = document.createElement("a");
    a.href = pdfSignedUrl;
    a.download = `${ebook?.titulo ?? "ebook"}.pdf`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/ebook" className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-bold text-lg truncate flex-1">{ebook?.titulo ?? "Leitura"}</h1>

        {/* PDF Download button — annual plan only */}
        {canDownloadPdf && pdfSignedUrl && (
          <button
            onClick={handleDownloadPdf}
            title="Baixar PDF (plano Anual)"
            className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition shrink-0"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            {useHtmlReader
              ? `Página ${htmlPage} de ${htmlTotal || "—"}`
              : `Página ${page} de ${total || "—"}`}
          </span>
          <span>{percent}% lido</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-energy transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* HTML Reader (iframe) */}
      {useHtmlReader && (
        <div className="mt-4 rounded-2xl overflow-hidden border bg-card shadow-soft">
          {loading ? (
            <div className="min-h-[70vh] grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary my-24" />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={htmlUrl!}
              title={ebook?.titulo ?? "eBook"}
              className="w-full border-0"
              style={{ height: "75vh" }}
              sandbox="allow-scripts allow-same-origin"
              loading="eager"
            />
          )}
        </div>
      )}

      {/* PDF Reader (fallback) */}
      {!useHtmlReader && (
        <>
          <div
            className="mt-4 relative select-none"
            style={{ perspective: "1600px" }}
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? "next" : "prev");
            }}
          >
            <div className="rounded-2xl overflow-hidden border bg-card shadow-soft min-h-[50vh] grid place-items-center">
              {loading || !current ? (
                <Loader2 className="size-8 animate-spin text-primary my-24" />
              ) : (
                <img src={current} alt={`Página ${page}`} className="w-full block" />
              )}
            </div>
            {flip && (
              <img
                src={flip.img}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full rounded-2xl border bg-card origin-left"
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  animation: `${flip.dir === "next" ? "page-flip-next" : "page-flip-prev"} 600ms ease-in-out forwards`,
                }}
              />
            )}
          </div>

          {!loadingAccess && !hasAccess && total > 0 && (
            <div className="mt-4">
              {bloqueado ? (
                <Paywall
                  titulo="Fim da prévia gratuita"
                  descricao={`Você leu as ${limite} páginas liberadas. Assine o FitPower para continuar a leitura completa e liberar toda a biblioteca.`}
                />
              ) : (
                <p className="text-xs text-center text-muted-foreground">
                  Prévia gratuita · {limite} de {total} páginas liberadas
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => go("prev")}
              disabled={page <= 1}
              className="flex-1 flex items-center justify-center gap-1 rounded-2xl border font-semibold py-3 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Anterior
            </button>
            <button
              onClick={() => go("next")}
              disabled={page >= limite}
              className="flex-1 flex items-center justify-center gap-1 rounded-2xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-40"
            >
              Próxima <ChevronRight className="size-4" />
            </button>
          </div>
        </>
      )}

      {/* Annual plan upsell for non-annual subscribers (show after reading) */}
      {!loadingAccess && hasAccess && plano !== "anual" && pdfSignedUrl && (
        <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-card/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Plano Anual</span> inclui download do PDF para ler offline
          </p>
          <Link
            to="/planos"
            className="mt-2 inline-flex items-center gap-1 rounded-xl bg-primary/10 text-primary text-xs font-semibold px-4 py-2 hover:bg-primary/20 transition"
          >
            <Download className="size-3" /> Ver planos
          </Link>
        </div>
      )}
    </div>
  );
}
