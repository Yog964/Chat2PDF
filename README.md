# Chat2PDF — Chrome Extension 📄✨

> Convert ChatGPT responses into clean, beautifully formatted study notes & PDFs with a single click.

![Chat2PDF Banner](icons/how-to-use.png)

## 🌟 Features

- **⚡ 1-Click Save:** Copy any ChatGPT response (`Ctrl+C`) and hover over the floating button to save.
- **👁️ Preview & Edit Mode:** Open full preview with inline editing — click any text, heading, or code snippet to customize notes before saving.
- **⬇️ Direct Download Mode:** Background PDF generation that triggers Chrome's native download without opening any extra tabs.
- **🎨 Study Notes Theme:** Clean typography, navy title (`#1a237e`), red section headers (`#cc0000`), highlighted code blocks, and formatted tables with alternating rows.
- **📄 Perfect A4 Print Layout:** Optimized page margins, borderless clean output, and smart line breaks designed for exam study notes.

---

## 🚀 How to Install in Chrome

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Yog964/Chat2PDF.git
   ```
2. Open Google Chrome and go to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left).
5. Select the `Chat2PDF` folder.
6. The extension is now installed and active! 🎉

---

## 📋 How to Use

1. Go to [ChatGPT](https://chatgpt.com) and ask a question.
2. Click the **Copy response** button (`❐`) or select the text and press <kbd>Ctrl+C</kbd>.
3. Hover over the floating **Save as PDF** button at the bottom-right corner.
4. Choose your option:
   - **Preview & Edit:** Review notes, edit text directly, print or download.
   - **Directly Download PDF:** Instant background PDF download with live status toasts!

---

## 🛠️ Tech Stack

- **Manifest V3** Chrome Extension
- **html2pdf.js / jsPDF / html2canvas** for high-fidelity client-side PDF rendering
- Pure JavaScript, HTML5, CSS3 (No external build tools needed)

---

## 📄 License

MIT License © 2026 Yogesh
