// Content script with element picker integration

let lastSelection = "";
let picker = null;

// Initialize picker when DOM is ready
function initializePicker() {
  if (window.ElementPicker && !picker) {
    picker = new window.ElementPicker();
    console.log("Element picker initialized successfully");
  } else if (!window.ElementPicker) {
    console.log("ElementPicker not available yet");
  }
}

// Wait for ElementPicker to be available
function waitForElementPicker() {
  if (window.ElementPicker) {
    initializePicker();
  } else {
    console.log("Waiting for ElementPicker...");
    setTimeout(waitForElementPicker, 50);
  }
}

// Start waiting for ElementPicker
waitForElementPicker();

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
  } else if (message.action === "startPicker") {
    console.log("Received startPicker message");
    if (!picker) {
      console.log("Picker not initialized, trying to initialize...");
      initializePicker();
    }
    if (picker) {
      console.log("Starting picker...");
      picker.start();
      sendResponse({ status: "success" });
    } else {
      console.error("Element picker not available");
      sendResponse({ status: "error", message: "Element picker not available" });
    }
  } else if (message.action === "stopPicker") {
    console.log("Received stopPicker message");
    if (picker) {
      picker.stop();
      sendResponse({ status: "success" });
    } else {
      sendResponse({ status: "error", message: "Element picker not available" });
    }
  }
  return true; // Keep message channel open for async response
});