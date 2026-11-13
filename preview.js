// =============================================
// Chat2PDF — Preview Page Script
// =============================================

(function () {
  'use strict';

  const wrapper       = document.getElementById('notesWrapper');
  const loadingState  = document.getElementById('loadingState');
  const titleInput    = document.getElementById('titleInput');
  const downloadBtn   = document.getElementById('downloadBtn');
  const printBtn      = document.getElementById('printBtn');

  // ── Load saved response ──
  async function loadContent() {
    try {
      const result = await chrome.storage.local.get('savedResponse');
      const data   = result.savedResponse;
      if (!data || !data.html) { showEmptyState(); return; }

      const title = data.title || 'ChatGPT Notes';
      titleInput.value  = title;
      document.title    = title + ' — Notes Preview';
      renderNotes(data.html, title);
    } catch (err) {
      console.error('Failed to load content:', err);
      showEmptyState();
    }
  }

  // ── Render notes ──
  function renderNotes(html, title) {
    loadingState.remove();

    const container = document.createElement('div');
    container.className = 'notes-container';
    container.id        = 'notesContent';
    container.contentEditable = 'true';
    container.spellcheck      = false;

    const temp = document.createElement('div');
    temp.innerHTML = html;
    if (!temp.firstElementChild || temp.firstElementChild.tagName !== 'H1') {
      if (title && title !== 'ChatGPT Notes') {
        const h1 = document.createElement('h1');
        h1.textContent = title;
        container.appendChild(h1);
      }
    }

    temp.querySelectorAll('button, svg, .gpt-notes-response-btn').forEach(el => el.remove());
    container.innerHTML += temp.innerHTML;
    wrapper.appendChild(container);
  }

  // ── Empty state ──
  function showEmptyState() {
    loadingState.remove();
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="emoji">📭</div>
      <h2>No notes to preview</h2>
      <p>Go to ChatGPT, copy a response, then click "Save Copied as PDF".</p>
    `;
    wrapper.appendChild(empty);
  }

  // ── Sanitize filename ──
  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().substring(0, 100);
  }

  // ── Download as PDF ──
  async function downloadPDF() {
    const content = document.getElementById('notesContent');
    if (!content) return;

    const title = titleInput.value.trim() || 'ChatGPT Notes';
    const h1 = content.querySelector('h1');
    if (h1 && titleInput.value.trim()) h1.textContent = titleInput.value.trim();

    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '⏳ Generating...';

    try {
      if (typeof html2pdf === 'undefined') { window.print(); return; }

      // ────────────────────────────────────────────
      // SIMPLE APPROACH: Use the actual on-screen
      // element as-is. No cloning, no width tricks,
      // no invisible containers. Just temporarily
      // add a border and let html2pdf auto-scale
      // the visible element to fit A4.
      // ────────────────────────────────────────────

      // Save original inline styles
      const origContentStyle = content.style.cssText;
      const origWrapperStyle = wrapper.style.cssText;

      // Temporarily style for PDF capture
      content.style.border       = 'none';
      content.style.borderRadius = '0';
      content.style.boxShadow    = 'none';

      // Remove centering margin so element starts at x=0
      wrapper.style.margin    = '0';
      wrapper.style.padding   = '0';
      wrapper.style.maxWidth  = '600px';

      // Constrain content for PDF
      content.style.padding       = '10px 14px 12px 14px';
      content.style.overflow      = 'hidden';
      content.style.wordWrap      = 'break-word';
      content.style.overflowWrap  = 'break-word';

      // Scroll to top
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));

      // Let html2pdf auto-detect element width — NO width/windowWidth overrides
      const opts = {
        margin:      [6,6,10,10],
        filename:    sanitizeFilename(title) + '.pdf',
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale:     2,
          useCORS:   true,
        },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:   { mode: ['css', 'legacy'] },
      };

      await html2pdf().set(opts).from(content).save();

      // Restore original styles
      content.style.cssText = origContentStyle;
      wrapper.style.cssText = origWrapperStyle;

    } catch (err) {
      console.error('PDF generation failed:', err);
      window.print();
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '⬇ Download PDF';
    }
  }

  // ── Print ──
  function printNotes() { window.print(); }

  // ── Event Listeners ──
  downloadBtn.addEventListener('click', downloadPDF);
  printBtn.addEventListener('click', printNotes);

  titleInput.addEventListener('input', () => {
    document.title = (titleInput.value.trim() || 'ChatGPT Notes') + ' — Notes Preview';
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); downloadPDF(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); printNotes(); }
  });

  // ── Headless Silent Download (no tab opened) ──
  async function downloadPDFHeadless() {
    const content = document.getElementById('notesContent');
    if (!content) return;

    const title = titleInput.value.trim() || 'ChatGPT Notes';
    const h1 = content.querySelector('h1');
    if (h1 && titleInput.value.trim()) h1.textContent = titleInput.value.trim();

    // Style for capture
    content.style.border       = 'none';
    content.style.borderRadius = '0';
    content.style.boxShadow    = 'none';

    wrapper.style.margin    = '0';
    wrapper.style.padding   = '0';
    wrapper.style.maxWidth  = '600px';

    content.style.padding       = '10px 14px 12px 14px';
    content.style.overflow      = 'hidden';
    content.style.wordWrap      = 'break-word';
    content.style.overflowWrap  = 'break-word';

    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));

    const opts = {
      margin:      [6, 6, 10, 10],
      filename:    sanitizeFilename(title) + '.pdf',
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale:     2,
        useCORS:   true,
      },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:   { mode: ['css', 'legacy'] },
    };

    try {
      // Generate base64 data URI
      const dataUri = await html2pdf().set(opts).from(content).outputPdf('datauristring');

      // Send to background service worker for reliable native download
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action:   'downloadPDF',
          dataUrl:  dataUri,
          filename: sanitizeFilename(title) + '.pdf'
        }, (res) => {
          if (chrome.runtime.lastError || (res && !res.success)) {
            // Fallback: direct save
            html2pdf().set(opts).from(content).save().then(resolve).catch(resolve);
          } else {
            resolve(res);
          }
        });
      });
    } catch (err) {
      console.warn('Headless dataUri download fallback to save():', err);
      await html2pdf().set(opts).from(content).save();
    }
  }

  // ── Init ──
  const urlParams  = new URLSearchParams(window.location.search);
  const isHeadless = urlParams.get('headless') === '1';

  if (isHeadless) {
    const tb = document.querySelector('.toolbar');
    if (tb) tb.style.display = 'none';
    document.body.style.background = '#ffffff';
  }

  loadContent().then(() => {
    if (isHeadless) {
      setTimeout(async () => {
        try {
          if (window.parent) {
            window.parent.postMessage({ type: 'GPT_NOTES_STATUS', msg: '📄 Generating PDF notes...' }, '*');
          }
          await downloadPDFHeadless();
          if (window.parent) {
            window.parent.postMessage({ type: 'GPT_NOTES_STATUS', msg: '✅ Download started!', done: true }, '*');
          }
        } catch (e) {
          console.error(e);
          if (window.parent) {
            window.parent.postMessage({ type: 'GPT_NOTES_STATUS', msg: '⚠️ Download error. Try Preview & Edit.', done: true }, '*');
          }
        }
      }, 500);
    }
  });
})();
