// Simplified content script - only handles page context
let lastSelection = "";

// Store selection when it changes - this is the most reliable approach
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    lastSelection = selection;
    console.log("Selection stored:", selection.substring(0, 50) + "...");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get_page_context") {
    try {
      // Get current selection or use last stored selection
      const currentSelection = window.getSelection().toString().trim();
      const selection = currentSelection || lastSelection;
      
      console.log("Getting page context - using selection:", 
        selection ? selection.substring(0, 50) + "..." : "none");
      
      const context = {
        url: window.location.href,
        title: document.title,
        selection: selection || null,
        // Get visible text if no selection
        visibleText: !selection ? document.body.innerText.slice(0, 1000) + "..." : null
      };
      
      sendResponse({ status: "success", data: context });
    } catch (error) {
      console.error("Content script error:", error);
      sendResponse({ status: "error", message: error.message });
    }
  }
  return true; // Keep message channel open for async response
});