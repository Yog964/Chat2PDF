// =============================================
// Chat2PDF v7
// Hover menu: Preview & Edit / Directly Download PDF
// =============================================

(function () {
  'use strict';

  const SCRIPT_VERSION = 6;
  if (window.__gptNotesSaverCleanup) {
    try { window.__gptNotesSaverCleanup(); } catch (e) {}
  }
  if (window.__gptNotesSaverVersion === SCRIPT_VERSION) return;
  window.__gptNotesSaverVersion = SCRIPT_VERSION;

  // ── Check extension context ──
  function isContextValid() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); }
    catch (e) { return false; }
  }

  // ── Cleanup ──
  function cleanup() {
    try {
      const fab = document.getElementById('gpt-notes-fab');
      if (fab) fab.remove();
      const btn = document.getElementById('gpt-notes-save-btn');
      if (btn) btn.remove();
      const frame = document.getElementById('gpt-notes-silent-frame');
      if (frame) frame.remove();
      const toast = document.getElementById('gpt-notes-toast');
      if (toast) toast.remove();
      window.__gptNotesSaverVersion = null;
    } catch (e) {}
  }
  window.__gptNotesSaverCleanup = cleanup;

  // ── Toast ──
  function showToast(msg, duration = 3500) {
    let toast = document.getElementById('gpt-notes-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gpt-notes-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ── Escape HTML special chars ──
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Format inline markdown: bold, italic, inline code ──
  function formatInline(text) {
    // escape first, then apply markdown
    return escapeHtml(text)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // ── Convert markdown text to clean HTML ──
  function textToHTML(rawText) {
    // Split into blocks by double newline first (paragraphs / sections)
    const lines = rawText.split('\n');
    let html = '';
    let inList = false;
    let listType = '';
    let inCodeBlock = false;
    let codeLines = [];
    let codeLang = '';

    const closeList = () => {
      if (inList) { html += `</${listType}>`;  inList = false; listType = ''; }
    };

    for (let i = 0; i < lines.length; i++) {
      const raw   = lines[i];
      const trim  = raw.trim();

      // ── Code block fence ──
      const fenceMatch = /^```(\w*)/.exec(trim);
      if (fenceMatch || (inCodeBlock && trim === '```')) {
        if (!inCodeBlock) {
          closeList();
          inCodeBlock = true;
          codeLang = fenceMatch[1] || '';
          codeLines = [];
        } else {
          // End of code block
          inCodeBlock = false;
          const codeContent = escapeHtml(codeLines.join('\n'));
          html += `<pre><code${codeLang ? ` class="language-${codeLang}"` : ''}>${codeContent}</code></pre>`;
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) { codeLines.push(raw); continue; }

      // ── Blank line ──
      if (!trim) {
        closeList();
        // Don't add extra <br> between every blank — just ignore extras
        continue;
      }

      // ── ATX Headings: # ## ### ──
      const h1m = /^#\s+(.+)/.exec(trim);
      const h2m = /^##\s+(.+)/.exec(trim);
      const h3m = /^###\s+(.+)/.exec(trim);
      const h4m = /^####\s+(.+)/.exec(trim);

      // ── Standalone bold line used as heading: **text** ──
      const boldHeading = /^\*\*([^*]+)\*\*\s*$/.exec(trim);

      // ── Bullet list ──
      const bulletM = /^[-•*+]\s+(.+)/.exec(trim);

      // ── Numbered list ──
      const numM = /^(\d+)[.)]\s+(.+)/.exec(trim);

      // ── Horizontal rule ──
      const hrM = /^[-*_]{3,}$/.test(trim);

      // ── Table row (pipe-separated) ──
      const tableM = /^\|.+\|/.test(trim);

      // Close list when non-list line encountered
      if (!bulletM && !numM) closeList();

      if (hrM) {
        html += '<hr>';
      } else if (h1m && !h2m) {
        html += `<h1>${formatInline(h1m[1])}</h1>`;
      } else if (h2m && !h3m) {
        html += `<h2>${formatInline(h2m[1])}</h2>`;
      } else if (h3m && !h4m) {
        html += `<h3>${formatInline(h3m[1])}</h3>`;
      } else if (h4m) {
        html += `<h4>${formatInline(h4m[1])}</h4>`;
      } else if (boldHeading) {
        // **Title** on its own line → treat as h2 or h3
        const content = boldHeading[1].trim();
        // If it looks like a top-level title (long, has colon), use h1
        if (content.length > 30 || content.includes('–') || content.includes(':')) {
          html += `<h1>${escapeHtml(content)}</h1>`;
        } else {
          html += `<h3>${escapeHtml(content)}</h3>`;
        }
      } else if (bulletM) {
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul>'; inList = true; listType = 'ul';
        }
        html += `<li>${formatInline(bulletM[1])}</li>`;
      } else if (numM) {
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol>'; inList = true; listType = 'ol';
        }
        html += `<li>${formatInline(numM[2])}</li>`;
      } else if (tableM) {
        // Skip table separator rows (|---|---|)
        if (/^\|[-|\s:]+\|$/.test(trim)) continue;
        // Simple table row
        const cells = trim.split('|').filter(c => c.trim() !== '');
        // Check if previous line was a header (look ahead for separator)
        const nextLine = (lines[i+1] || '').trim();
        const isThead = /^\|[-|\s:]+\|$/.test(nextLine);
        if (isThead) {
          if (!html.endsWith('<table>')) html += '<table>';
          html += '<thead><tr>' + cells.map(c => `<th>${formatInline(c.trim())}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          if (!html.includes('<table>')) html += '<table><tbody>';
          html += '<tr>' + cells.map(c => `<td>${formatInline(c.trim())}</td>`).join('') + '</tr>';
        }
        // Close table on last table row
        const nextNext = (lines[i+2] || '').trim();
        if (nextNext === '' || !nextNext.startsWith('|')) {
          html += '</tbody></table>';
        }
      } else {
        // Regular paragraph
        html += `<p>${formatInline(trim)}</p>`;
      }
    }

    closeList();
    if (inCodeBlock && codeLines.length > 0) {
      html += `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
    }

    return html;
  }

  // ── Extract title from text ──
  function extractTitle(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 6)) {
      // Strip ALL markdown symbols to get clean title text
      let clean = line
        .replace(/^#+\s*/, '')               // ## heading markers
        .replace(/^\*\*\*(.+)\*\*\*$/, '$1') // ***bold italic***
        .replace(/^\*\*(.+)\*\*$/, '$1')     // **bold**  ← fixes your title bug
        .replace(/^\*(.+)\*$/, '$1')         // *italic*
        .replace(/^__(.+)__$/, '$1')         // __bold__
        .replace(/^_(.+)_$/, '$1')           // _italic_
        .trim();
      if (clean.length > 5 && clean.length < 200 && !clean.startsWith('-')) {
        return clean;
      }
    }
    return 'ChatGPT Notes';
  }

  // ── Main: Read clipboard and save ──
  async function readClipboardAndSave(mode = 'preview') {
    if (!isContextValid()) {
      showToast('⚠️ Please refresh this page (F5) and try again.');
      return;
    }

    showToast('📋 Reading clipboard...');

    let clipboardText = '';

    try {
      clipboardText = await navigator.clipboard.readText();
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.focus();
        document.execCommand('paste');
        clipboardText = ta.value;
        document.body.removeChild(ta);
      } catch (e2) {
        showToast('⚠️ Could not read clipboard. Try using Ctrl+C first, then click this button.');
        console.error('[ChatGPT Notes Saver] Clipboard read failed:', e, e2);
        return;
      }
    }

    if (!clipboardText || clipboardText.trim().length < 10) {
      showToast('⚠️ Clipboard is empty. Please select & copy (Ctrl+C) the ChatGPT response first!');
      return;
    }

    const text  = clipboardText.trim();
    const title = extractTitle(text);
    const html  = textToHTML(text);

    try {
      await chrome.storage.local.set({
        savedResponse: {
          html:      html,
          title:     title,
          timestamp: new Date().toISOString(),
        }
      });

      if (mode === 'preview') {
        showToast('📄 Opening PDF preview & editor...');
        chrome.runtime.sendMessage({ action: 'openPreview' });
      } else {
        showToast('⏳ Initializing PDF download...');

        // Remove any old silent download iframe
        const oldFrame = document.getElementById('gpt-notes-silent-frame');
        if (oldFrame) oldFrame.remove();

        // Create invisible off-screen iframe to generate PDF without opening any tab
        const iframe = document.createElement('iframe');
        iframe.id = 'gpt-notes-silent-frame';
        iframe.src = chrome.runtime.getURL('preview.html?headless=1');
        iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:750px;height:1000px;border:none;pointer-events:none;z-index:-999999;';
        document.body.appendChild(iframe);

        // Safety timeout: remove iframe after 25 seconds
        setTimeout(() => {
          const f = document.getElementById('gpt-notes-silent-frame');
          if (f) f.remove();
        }, 25000);
      }
    } catch (err) {
      if (err.message && err.message.includes('context invalidated')) {
        showToast('⚠️ Please refresh this page (F5) and try again.');
      } else {
        showToast('⚠️ Error. Please try again.');
        console.error('[ChatGPT Notes Saver]', err);
      }
    }
  }

  // ── Floating Button with Hover Menu ──
  function createFloatingButton() {
    if (document.getElementById('gpt-notes-fab')) return;

    // Wrapper
    const fab = document.createElement('div');
    fab.id = 'gpt-notes-fab';

    // ── Hover menu ──
    const menu = document.createElement('div');
    menu.id = 'gpt-notes-menu';

    // Option 1: Preview & Edit
    const btnPreview = document.createElement('button');
    btnPreview.id        = 'gpt-menu-preview';
    btnPreview.className = 'gpt-menu-item';
    btnPreview.innerHTML = '<span class="menu-icon">👁️</span><span>Preview &amp; Edit</span>';
    btnPreview.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isContextValid()) { showToast('⚠️ Please refresh (F5) and try again.'); return; }
      await readClipboardAndSave('preview');
    });

    // Option 2: Directly Download PDF
    const btnDownload = document.createElement('button');
    btnDownload.id        = 'gpt-menu-download';
    btnDownload.className = 'gpt-menu-item';
    btnDownload.innerHTML = '<span class="menu-icon">⬇️</span><span>Directly Download PDF</span>';
    btnDownload.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isContextValid()) { showToast('⚠️ Please refresh (F5) and try again.'); return; }
      await readClipboardAndSave('download');
    });

    menu.appendChild(btnPreview);
    menu.appendChild(btnDownload);

    // ── Main FAB button (Hover-only trigger) ──
    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    const btn = document.createElement('div');
    btn.id        = 'gpt-notes-save-btn';
    btn.title     = 'Hover to choose: Preview & Edit or Directly Download PDF';
    btn.innerHTML = `<img src="${iconUrl}" class="btn-icon" alt="Chat2PDF" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;"><span class="btn-text">Save as PDF</span><span class="btn-arrow">▲</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    fab.appendChild(menu);
    fab.appendChild(btn);
    document.body.appendChild(fab);
  }

  // ── Init ──
  function init() {
    // Remove any old buttons from previous versions
    document.querySelectorAll('.gpt-notes-response-btn').forEach(b => b.remove());
    const oldPopup = document.getElementById('gpt-notes-popup');
    if (oldPopup) oldPopup.remove();

    // Listen for status messages from silent download iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GPT_NOTES_STATUS') {
        if (event.data.msg) showToast(event.data.msg);
        if (event.data.done) {
          setTimeout(() => {
            const frame = document.getElementById('gpt-notes-silent-frame');
            if (frame) frame.remove();
          }, 1800);
        }
      }
    });

    createFloatingButton();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 800);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  }

})();
