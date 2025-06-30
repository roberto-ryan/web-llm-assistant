// Simplified content script - only handles page context
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get_page_context") {
    try {
      // Get selected text or page title/URL
      const selection = window.getSelection().toString();
      const context = {
        url: window.location.href,
        title: document.title,
        selection: selection || null,
        // Get visible text if no selection
        visibleText: !selection ? document.body.innerText.slice(0, 1000) + "..." : null
      };
      sendResponse({ status: "success", data: context });
    } catch (error) {
      sendResponse({ status: "error", message: error.message });
    }
  }
  return true; // Keep message channel open for async response
});