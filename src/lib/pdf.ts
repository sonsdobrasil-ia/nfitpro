// Client-only helpers around pdf.js
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function loadPdf(source: ArrayBuffer | string) {
  const pdfjs = await getPdfjs();
  const params = typeof source === "string" ? { url: source } : { data: source };
  return pdfjs.getDocument(params as any).promise;
}

export async function renderPageToCanvas(
  pdf: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxWidth = 900,
) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(maxWidth / base.width, 2) * dpr;
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.aspectRatio = `${base.width} / ${base.height}`;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
}

/** Reads a PDF file: returns page count and the first page rendered as a PNG cover. */
export async function extractPdfInfo(file: File): Promise<{ pages: number; cover: File }> {
  const buffer = await file.arrayBuffer();
  const pdf = await loadPdf(buffer.slice(0));
  const pages = pdf.numPages;
  const canvas = document.createElement("canvas");
  await renderPageToCanvas(pdf, 1, canvas, 800);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a capa"))), "image/png", 0.92),
  );
  const cover = new File([blob], "capa.png", { type: "image/png" });
  return { pages, cover };
}
