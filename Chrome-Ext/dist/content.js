(() => {
  // src/content.js
  var DOMChangeTracker = class {
    constructor() {
      this.changes = [];
      this.observer = null;
      this.startTime = null;
    }
    start() {
      this.startTime = Date.now();
      this.changes = [];
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const change = {
            type: mutation.type,
            timestamp: Date.now(),
            target: this.getElementPath(mutation.target)
          };
          if (mutation.type === "childList") {
            change.addedNodes = Array.from(mutation.addedNodes).map((node) => ({
              nodeType: node.nodeType,
              nodeName: node.nodeName,
              textContent: node.textContent
            }));
            change.removedNodes = Array.from(mutation.removedNodes).map((node) => ({
              nodeType: node.nodeType,
              nodeName: node.nodeName,
              textContent: node.textContent
            }));
          } else if (mutation.type === "attributes") {
            change.attributeName = mutation.attributeName;
            change.oldValue = mutation.oldValue;
            change.newValue = mutation.target.getAttribute(mutation.attributeName);
          } else if (mutation.type === "characterData") {
            change.oldValue = mutation.oldValue;
            change.newValue = mutation.target.textContent;
          }
          this.changes.push(change);
        });
      });
      this.observer.observe(document.body, {
        childList: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true
      });
    }
    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      return this.changes;
    }
    generateUndoCode() {
      if (this.changes.length === 0)
        return null;
      const undoOperations = this.changes.reverse().map((change) => {
        if (change.type === "attributes" && change.oldValue !== null) {
          return `document.querySelector('${change.target}').setAttribute('${change.attributeName}', '${change.oldValue}');`;
        } else if (change.type === "characterData") {
          return `document.querySelector('${change.target}').textContent = '${change.oldValue}';`;
        }
        return `// Complex undo operation for ${change.type} change`;
      });
      return undoOperations.join("\n");
    }
    getElementPath(element) {
      if (!element || element === document.body)
        return "body";
      const parts = [];
      while (element && element !== document.body) {
        let selector = element.tagName.toLowerCase();
        if (element.id) {
          selector += `#${element.id}`;
          parts.unshift(selector);
          break;
        } else if (element.className) {
          selector += `.${element.className.split(" ").join(".")}`;
        }
        const siblings = Array.from(element.parentNode.children);
        const index = siblings.indexOf(element);
        if (index > 0) {
          selector += `:nth-child(${index + 1})`;
        }
        parts.unshift(selector);
        element = element.parentNode;
      }
      return parts.join(" > ");
    }
  };
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
    } else if (message.action === "executeCode") {
      try {
        let changeTracker = null;
        if (message.trackChanges) {
          changeTracker = new DOMChangeTracker();
          changeTracker.start();
        }
        const result = function() {
          try {
            const execute = new Function("document", "window", message.code);
            const output = execute(document, window);
            return { success: true, output };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }();
        if (changeTracker) {
          const changes = changeTracker.stop();
          result.changes = changes;
          result.undoCode = changeTracker.generateUndoCode();
        }
        if (message.toolId) {
          chrome.runtime.sendMessage({
            action: "codeExecuted",
            toolId: message.toolId,
            isAutoRun: message.isAutoRun || false
          });
        }
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    return true;
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      chrome.runtime.sendMessage({ action: "pageReady", url: window.location.href });
    });
  } else {
    chrome.runtime.sendMessage({ action: "pageReady", url: window.location.href });
  }
})();
