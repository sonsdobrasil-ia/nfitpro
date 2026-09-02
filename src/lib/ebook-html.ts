import { supabase } from "@/integrations/supabase/client";
import { getPdfjs, renderPageToCanvas } from "@/lib/pdf";
import { previewPages } from "@/lib/plans";

const HTML_BUCKET = "ebook-html";

export type ConvertResult = {
  /** Caminho do HTML completo no storage */
  htmlPath: string;
  /** Caminho do HTML de prévia (primeiras páginas) */
  previewPath: string;
  totalPages: number;
  previewPageCount: number;
};

export function htmlPaths(ebookId: string) {
  return {
    full: `html/${ebookId}.html`,
    preview: `html/${ebookId}-preview.html`,
  };
}

/**
 * Converte um PDF (via URL assinada) em dois arquivos HTML autocontidos:
 * o livro completo e a prévia gratuita (primeiras páginas).
 * Cada página vira uma imagem JPEG embutida no HTML.
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

  const previewCount = Math.min(previewPages(numPages), numPages);
  const paths = htmlPaths(ebookId);

  await uploadHtmlFile(paths.full, buildHtml(images, { total: numPages }));
  await uploadHtmlFile(
    paths.preview,
    buildHtml(images.slice(0, previewCount), { total: numPages, preview: true }),
  );

  return {
    htmlPath: paths.full,
    previewPath: paths.preview,
    totalPages: numPages,
    previewPageCount: previewCount,
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
  await supabase.storage.from(HTML_BUCKET).remove([paths.full, paths.preview]).catch(() => {});
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
    ? `<section class="page" id="p${shown + 1}" data-page="${shown + 1}" aria-label="Fim da prévia">
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
    --radius: 16px;
    --shadow: 0 8px 32px rgba(0,0,0,0.5);
  }

  html, body {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
  }

  #app { display: flex; flex-direction: column; height: 100%; }

  #topbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
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
    transition: width 0.3s ease;
    width: 0%;
  }
  #pct { font-size: 12px; color: var(--muted); white-space: nowrap; }
  .tag {
    font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
    color: var(--primary-fg); background: var(--primary); border-radius: 99px; padding: 3px 8px;
  }

  #viewer { flex: 1; overflow: hidden; position: relative; touch-action: pan-y; }

  .page {
    position: absolute;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 12px;
    overflow: hidden;
  }
  .page.active { display: flex; }
  .page img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    user-select: none;
    -webkit-user-drag: none;
  }
  .cta { max-width: 420px; text-align: center; padding: 24px; }
  .cta h2 { font-size: 22px; margin-bottom: 10px; }
  .cta p { color: var(--muted); font-size: 15px; line-height: 1.5; }

  @keyframes flip-next {
    from { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
    to   { transform: perspective(1200px) rotateY(-90deg); opacity: 0; }
  }
  @keyframes flip-prev {
    from { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
    to   { transform: perspective(1200px) rotateY(90deg); opacity: 0; }
  }
  .flip-out-next { animation: flip-next 0.22s ease-in forwards; }
  .flip-out-prev { animation: flip-prev 0.22s ease-in forwards; }

  #controls {
    flex-shrink: 0;
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    background: var(--surface);
    border-top: 1px solid var(--border);
  }
  .btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    border-radius: var(--radius);
    padding: 12px 0;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:disabled { opacity: 0.3; cursor: default; }
  .btn:not(:disabled):active { background: var(--border); }
  .btn.primary {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--primary-fg);
    box-shadow: 0 0 16px rgba(124,58,237,0.4);
  }
  .btn.primary:not(:disabled):active { background: #6d28d9; }

  @media (max-width: 480px) {
    .btn { font-size: 14px; padding: 10px 0; }
    #topbar { padding: 8px 12px; }
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

  <div id="controls">
    <button class="btn" id="btn-prev" disabled onclick="go('prev')">&#8249; Anterior</button>
    <button class="btn primary" id="btn-next" onclick="go('next')">Próxima &#8250;</button>
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
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');

  function show(n, dir) {
    if (n < 1 || n > TOTAL || n === cur) return;
    var leaving = document.querySelector('.page.active');
    var entering = document.getElementById('p' + n);
    if (!entering) return;

    if (leaving && dir) {
      var cls = dir === 'next' ? 'flip-out-next' : 'flip-out-prev';
      leaving.classList.add(cls);
      leaving.addEventListener('animationend', function () {
        leaving.classList.remove('active', cls);
      }, { once: true });
    } else if (leaving) {
      leaving.classList.remove('active');
    }

    entering.classList.add('active');
    cur = n;
    sync();
  }

  function sync() {
    var pct = Math.round((cur / TOTAL) * 100);
    barEl.style.width = pct + '%';
    pctEl.textContent = pct + '%';
    curEl.textContent = cur;
    btnPrev.disabled = cur <= 1;
    btnNext.disabled = cur >= TOTAL;
    try {
      window.parent.postMessage({ type: 'ebook-page', page: cur, total: TOTAL, realTotal: REAL_TOTAL }, '*');
    } catch (_) {}
  }

  window.go = function (dir) {
    show(dir === 'next' ? cur + 1 : cur - 1, dir);
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') go('next');
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') go('prev');
  });

  var tx = 0;
  document.getElementById('viewer').addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('viewer').addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 48) go(dx < 0 ? 'next' : 'prev');
  }, { passive: true });

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'ebook-goto') show(e.data.page, null);
  });

  document.getElementById('p1').classList.add('active');
  sync();
})();
</script>
</body>
</html>`;
}
