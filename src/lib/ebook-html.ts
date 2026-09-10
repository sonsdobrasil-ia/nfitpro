import { supabase } from "@/integrations/supabase/client";
import { getPdfjs, renderPageToCanvas } from "@/lib/pdf";

const HTML_BUCKET = "ebook-html";

export type ConvertResult = {
  /** Caminho do HTML completo no storage */
  htmlPath: string;
  totalPages: number;
};

export function htmlPaths(ebookId: string) {
  return {
    full: `html/${ebookId}.html`,
    preview: `html/${ebookId}-preview.html`,
  };
}

/**
 * Converte um PDF (via URL assinada) em um HTML autocontido com o livro
 * completo. Cada página vira uma imagem JPEG embutida no HTML.
 */
export async function convertPdfToHtml(
  pdfSignedUrl: string,
  ebookId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<ConvertResult> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ url: pdfSignedUrl }).promise;
  const numPages = doc.numPages;

  const images: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages);
    const canvas = document.createElement("canvas");
    await renderPageToCanvas(doc, i, canvas, 900);
    images.push(canvas.toDataURL("image/jpeg", 0.82));
  }

  const paths = htmlPaths(ebookId);
  await uploadHtmlFile(paths.full, buildHtml(images, { total: numPages }));
  // Remove qualquer prévia antiga — agora só existe a versão completa
  await supabase.storage.from(HTML_BUCKET).remove([paths.preview]).catch(() => {});

  return {
    htmlPath: paths.full,
    totalPages: numPages,
  };
}

async function uploadHtmlFile(path: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], path.split("/").pop() ?? "ebook.html", { type: "text/html" });
  await supabase.storage.from(HTML_BUCKET).remove([path]).catch(() => {});
  const { error } = await supabase.storage.from(HTML_BUCKET).upload(path, file, {
    contentType: "text/html",
    upsert: true,
  });
  if (error) throw new Error(`Falha ao salvar o HTML (${path}): ${error.message}`);
}

/** Retorna uma URL assinada para o arquivo HTML (6 horas) */
export async function resolveHtmlUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data, error } = await supabase.storage
    .from(HTML_BUCKET)
    .createSignedUrl(value, 60 * 60 * 6);
  if (error || !data) {
    console.warn("[ebook-html] não foi possível assinar", value, error?.message);
    return null;
  }
  return data.signedUrl;
}

/** Remove um arquivo HTML do storage */
export async function deleteHtml(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  await supabase.storage.from(HTML_BUCKET).remove([value]);
}

/** Remove HTML completo e prévia de um eBook */
export async function deleteEbookHtml(ebookId: string) {
  const paths = htmlPaths(ebookId);
  const { error } = await supabase.storage
    .from(HTML_BUCKET)
    .remove([paths.full, paths.preview]);
  if (error) {
    const { removeStorageFiles } = await import("./ebook-storage.functions");
    await removeStorageFiles({ data: { html: [paths.full, paths.preview] } }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Template HTML — leitor autocontido
// ---------------------------------------------------------------------------

function buildHtml(images: string[], opts: { total: number; preview?: boolean }): string {
  const shown = images.length;
  const total = opts.total;
  const isPreview = !!opts.preview;

  const pageSections = images
    .map(
      (src, i) =>
        `<section class="page" id="p${i + 1}" data-page="${i + 1}" aria-label="Página ${i + 1}">` +
        `<img src="${src}" alt="Página ${i + 1}" loading="${i < 3 ? "eager" : "lazy"}" />` +
        `</section>`,
    )
    .join("\n");

  const previewEnd = isPreview
    ? `<section class="page cta-page" id="p${shown + 1}" data-page="${shown + 1}" aria-label="Fim da prévia">
        <div class="cta">
          <h2>Fim da prévia gratuita</h2>
          <p>Você leu ${shown} de ${total} páginas. Assine o FitPower para ler este e todos os outros eBooks da biblioteca.</p>
        </div>
      </section>`
    : "";

  const pageCount = isPreview ? shown + 1 : shown;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>eBook FitPower</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f0f13;
    --surface: #1a1a24;
    --border: #2a2a3a;
    --primary: #7c3aed;
    --primary-fg: #ffffff;
    --muted: #6b7280;
    --text: #f3f4f6;
  }

  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  #topbar {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 10;
  }
  #page-info { font-size: 13px; color: var(--muted); white-space: nowrap; }
  #progress-wrap { flex: 1; height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; }
  #progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), #a855f7);
    border-radius: 99px;
    transition: width 0.2s ease;
    width: 0%;
  }
  #pct { font-size: 12px; color: var(--muted); white-space: nowrap; }
  .tag {
    font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
    color: var(--primary-fg); background: var(--primary); border-radius: 99px; padding: 3px 8px;
  }

  /* Leitura contínua de cima para baixo, página em largura total */
  #viewer { width: 100%; }

  .page { width: 100%; }
  .page img {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-drag: none;
  }

  .cta-page { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 24px; }
  .cta { max-width: 420px; text-align: center; }
  .cta h2 { font-size: 22px; margin-bottom: 10px; }
  .cta p { color: var(--muted); font-size: 15px; line-height: 1.5; }

  @media (max-width: 640px) {
    #topbar { padding: 6px 10px; }
    #page-info { font-size: 12px; }
    #pct { font-size: 11px; }
    .cta h2 { font-size: 18px; }
    .cta p { font-size: 14px; }
  }
</style>
</head>
<body>
<div id="app">
  <div id="topbar">
    ${isPreview ? '<span class="tag">Prévia</span>' : ""}
    <span id="page-info">Página <strong id="cur">1</strong> de <strong>${pageCount}</strong>${isPreview ? ` <span style="color:var(--muted)">(de ${total})</span>` : ""}</span>
    <div id="progress-wrap"><div id="progress-bar"></div></div>
    <span id="pct">0%</span>
  </div>

  <div id="viewer">
${pageSections}
${previewEnd}
  </div>
</div>

<script>
(function () {
  var TOTAL = ${pageCount};
  var REAL_TOTAL = ${total};
  var cur = 1;

  var barEl = document.getElementById('progress-bar');
  var pctEl = document.getElementById('pct');
  var curEl = document.getElementById('cur');

  function sync(page) {
    cur = page;
    var pct = Math.round((cur / TOTAL) * 100);
    barEl.style.width = pct + '%';
    pctEl.textContent = pct + '%';
    curEl.textContent = cur;
    try {
      window.parent.postMessage({ type: 'ebook-page', page: cur, total: TOTAL, realTotal: REAL_TOTAL }, '*');
    } catch (_) {}
  }

  // Detecta a página visível conforme a rolagem
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var p = parseInt(en.target.getAttribute('data-page'), 10);
          if (p && p !== cur) sync(p);
        }
      });
    }, { rootMargin: '-40% 0px -40% 0px' });
    pages.forEach(function (el) { io.observe(el); });
  } else {
    window.addEventListener('scroll', function () {
      var mid = window.scrollY + window.innerHeight / 2;
      var acc = 0;
      for (var i = 0; i < pages.length; i++) {
        acc += pages[i].offsetHeight;
        if (mid <= acc) { sync(i + 1); break; }
      }
    }, { passive: true });
  }

  // Permite que o app pai role até uma página específica
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'ebook-goto') {
      var el = document.getElementById('p' + e.data.page);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  });

  sync(1);
})();
</script>
</body>
</html>`;
}
