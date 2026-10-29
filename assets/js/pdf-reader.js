import { getDocument, GlobalWorkerOptions } from '../vendor/pdfjs/pdf.min.mjs';

// PDF.js 5.6.205, Apache-2.0. All code, fonts, and PDF bytes are self-hosted.
const vendorRoot = new URL('../vendor/pdfjs/', import.meta.url);
GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', vendorRoot).href;
const canvas = document.querySelector('#pdf-page');
const scrollRegion = document.querySelector('#page-scroll');
const status = document.querySelector('#reader-status');
const pageText = document.querySelector('#page-text');
const pageInput = document.querySelector('#page-number');
const pageCount = document.querySelector('#page-count');
const previous = document.querySelector('#previous-page');
const next = document.querySelector('#next-page');
const zoom = document.querySelector('#zoom');
let documentPdf;
let currentPage = 1;
let rendering = false;
let queuedPage = null;

function updateControls() {
  pageInput.value = String(currentPage);
  pageInput.max = String(documentPdf.numPages);
  pageCount.textContent = `of ${documentPdf.numPages}`;
  previous.disabled = currentPage === 1;
  next.disabled = currentPage === documentPdf.numPages;
}

async function renderPage(number) {
  if (!documentPdf) return;
  const requested = Math.min(documentPdf.numPages, Math.max(1, Number(number) || 1));
  if (rendering) { queuedPage = requested; return; }
  rendering = true;
  currentPage = requested;
  updateControls();
  try {
    const page = await documentPdf.getPage(currentPage);
    const unscaled = page.getViewport({ scale: 1 });
    const padding = parseFloat(getComputedStyle(scrollRegion).paddingLeft) * 2;
    const fitScale = Math.max(.2, (scrollRegion.clientWidth - padding) / unscaled.width);
    const viewport = page.getViewport({ scale: zoom.value === 'fit' ? fitScale : Number(zoom.value) });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    canvas.hidden = false;
    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
      transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
    }).promise;
    canvas.setAttribute('aria-label', `${document.title}, page ${currentPage} of ${documentPdf.numPages}`);
    const text = await page.getTextContent();
    pageText.textContent = text.items.map(item => item.str || '').join(' ');
    status.hidden = true;
  } catch (error) {
    status.hidden = false;
    status.textContent = 'This page could not be displayed. Use Download to read the original PDF.';
    console.error('PDF page rendering failed:', error);
  } finally {
    rendering = false;
    if (queuedPage !== null) { const pending = queuedPage; queuedPage = null; renderPage(pending); }
  }
}

previous.addEventListener('click', () => renderPage(currentPage - 1));
next.addEventListener('click', () => renderPage(currentPage + 1));
pageInput.addEventListener('change', () => renderPage(pageInput.value));
zoom.addEventListener('change', () => renderPage(currentPage));
document.addEventListener('keydown', event => {
  if (event.target.matches('input, select') || !documentPdf) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); renderPage(currentPage + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); renderPage(currentPage - 1); }
});
let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (zoom.value === 'fit') renderPage(currentPage); }, 120);
}).observe(scrollRegion);

try {
  documentPdf = await getDocument({
    url: new URL(document.body.dataset.pdf, document.baseURI).href,
    standardFontDataUrl: new URL('standard_fonts/', vendorRoot).href,
    wasmUrl: new URL('wasm/', vendorRoot).href,
    isEvalSupported: false,
  }).promise;
  pageInput.disabled = false;
  zoom.disabled = false;
  await renderPage(1);
} catch (error) {
  status.textContent = 'The embedded reader could not load. Use Download to open the original PDF.';
  console.error('PDF loading failed:', error);
}
