import { supabase } from "@/integrations/supabase/client";
import { getPdfjs, renderPageToCanvas } from "@/lib/pdf";

const HTML_BUCKET = "ebook-html";

/**
 * Converts a PDF (from a signed URL) to a self-contained HTML file.
 * Each page is rendered as a JPEG image and embedded in the HTML.
 * The HTML includes a premium dark-mode reader with keyboard/swipe navigation
 * and a progress bar.
 *
 * @param pdfSignedUrl - Signed URL of the PDF in Supabase Storage
 * @param ebookId      - UUID of the ebook (used for the file path)
 * @param onProgress   - Optional callback (current page, total pages)
 * @returns The storage path of the uploaded HTML file
 */
export async function convertPdfToHtml(
  pdfSignedUrl: string,
  ebookId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ url: pdfSignedUrl }).promise;
  const numPages = doc.numPages;

  // Render every page to a JPEG base64 string
  const images: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages);
    const canvas = document.createElement("canvas");
    await renderPageToCanvas(doc, i, canvas, 900);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    images.push(dataUrl);
  }

  const html = buildHtml(images);

  // Upload the HTML file
  const path = `html/${ebookId}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], `${ebookId}.html`, { type: "text/html" });

  // Delete old version if it exists (ignore errors)
  await supabase.storage.from(HTML_BUCKET).remove([path]).catch(() => {});

  const { error } = await supabase.storage.from(HTML_BUCKET).upload(path, file, {
    contentType: "text/html",
    upsert: true,
  });
  if (error) throw new Error(`Falha ao salvar o HTML: ${error.message}`);

  return path;
}

/** Returns a signed URL for the HTML reader file (6-hour expiry) */
export async function resolveHtmlUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data, error } = await supabase.storage
    .from(HTML_BUCKET)
    .createSignedUrl(value, 60 * 60 * 6);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Delete an HTML file from storage */
export async function deleteHtml(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return;
  await supabase.storage.from(HTML_BUCKET).remove([value]);
}

// ---------------------------------------------------------------------------
// HTML template builder — self-contained premium reader
// ---------------------------------------------------------------------------

function buildHtml(images: string[]): string {
  const total = images.length;

  // Embed each page as a <section> with the base64 image
  const pageSections = images
    .map(
      (src, i) =>
        `<section class="page" id="p${i + 1}" data-page="${i + 1}" aria-label="Página ${i + 1}">` +
        `<img src="${src}" alt="Página ${i + 1}" loading="${i < 3 ? "eager" : "lazy"}" />` +
        `</section>`,
    )
    .join("\n");

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

  /* ---------- Layout ---------- */
  #app {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ---------- Top bar ---------- */
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
  #page-info {
    font-size: 13px;
    color: var(--muted);
    white-space: nowrap;
  }
  #progress-wrap {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
  }
  #progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), #a855f7);
    border-radius: 99px;
    transition: width 0.3s ease;
    width: 0%;
  }
  #pct { font-size: 12px; color: var(--muted); white-space: nowrap; }

  /* ---------- Page viewer ---------- */
  #viewer {
    flex: 1;
    overflow: hidden;
    position: relative;
    touch-action: pan-y;
  }

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

  /* ---------- Flip animation ---------- */
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

  /* ---------- Bottom controls ---------- */
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

  /* ---------- Responsive ---------- */
  @media (max-width: 480px) {
    .btn { font-size: 14px; padding: 10px 0; }
    #topbar { padding: 8px 12px; }
  }
</style>
</head>
<body>
<div id="app">
  <div id="topbar">
    <span id="page-info">Página <strong id="cur">1</strong> de <strong>${total}</strong></span>
    <div id="progress-wrap"><div id="progress-bar"></div></div>
    <span id="pct">0%</span>
  </div>

  <div id="viewer">
${pageSections}
  </div>

  <div id="controls">
    <button class="btn" id="btn-prev" disabled onclick="go('prev')">&#8249; Anterior</button>
    <button class="btn primary" id="btn-next" onclick="go('next')">Próxima &#8250;</button>
  </div>
</div>

<script>
(function () {
  var TOTAL = ${total};
  var cur = 1;

  var pages = document.querySelectorAll('.page');
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
    // Notify parent frame of page change
    try { window.parent.postMessage({ type: 'ebook-page', page: cur, total: TOTAL }, '*'); } catch(_) {}
  }

  window.go = function (dir) {
    show(dir === 'next' ? cur + 1 : cur - 1, dir);
  };

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') go('next');
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') go('prev');
  });

  // Touch / swipe
  var tx = 0;
  document.getElementById('viewer').addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('viewer').addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 48) go(dx < 0 ? 'next' : 'prev');
  }, { passive: true });

  // Listen for parent messages (page jump)
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'ebook-goto') show(e.data.page, null);
  });

  // Init
  document.getElementById('p1').classList.add('active');
  sync();
})();
</script>
</body>
</html>`;
}
