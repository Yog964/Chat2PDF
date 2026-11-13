// Background service worker for ChatGPT Notes Saver

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPreview') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('preview.html')
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'downloadPDF') {
    chrome.downloads.download({
      url: message.dataUrl,
      filename: message.filename || 'ChatGPT_Notes.pdf',
      saveAs: false
    }, (downloadId) => {
      sendResponse({ success: !!downloadId, downloadId: downloadId });
    });
    return true;
  }

  return true;
});
