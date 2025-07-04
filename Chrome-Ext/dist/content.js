(() => {
  // src/content.js
  var lastSelection = "";
  var picker = null;
  var elementManager = null;
  function initializePicker() {
    if (window.ElementPicker && window.ElementManager && !picker) {
      elementManager = new window.ElementManager();
      picker = new window.ElementPicker(elementManager);
      console.log("Element picker and manager initialized successfully");
    } else if (!window.ElementPicker || !window.ElementManager) {
      console.log("ElementPicker or ElementManager not available yet");
    }
  }
  function waitForElementPicker() {
    if (window.ElementPicker && window.ElementManager) {
      initializePicker();
    } else {
      console.log("Waiting for ElementPicker and ElementManager...");
      setTimeout(waitForElementPicker, 50);
    }
  }
  waitForElementPicker();
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      lastSelection = selection;
      console.log("Selection stored:", selection.substring(0, 50) + "...");
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a;
    if (message.action === "get_page_context") {
      try {
        const currentSelection = window.getSelection().toString().trim();
        const selection = currentSelection || lastSelection;
        console.log(
          "Getting page context - using selection:",
          selection ? selection.substring(0, 50) + "..." : "none"
        );
        const context = {
          url: window.location.href,
          title: document.title,
          selection: selection || null,
          // Get visible text if no selection
          visibleText: !selection ? document.body.innerText.slice(0, 1e3) + "..." : null
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
    } else if (message.action === "getElementData") {
      try {
        const element = document.querySelector(message.selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          const data = {
            exists: true,
            text: ((_a = element.textContent) == null ? void 0 : _a.trim()) || "",
            value: element.value || "",
            tagName: element.tagName.toLowerCase(),
            className: element.className || "",
            id: element.id || "",
            position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
          };
          sendResponse({ status: "success", data });
        } else {
          sendResponse({ status: "error", message: "Element not found" });
        }
      } catch (error) {
        sendResponse({ status: "error", message: error.message });
      }
    }
    return true;
  });
})();
