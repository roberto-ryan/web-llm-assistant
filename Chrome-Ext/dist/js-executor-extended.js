// src/js-executor.js
var JSExecutor = class {
  constructor(callExternalAPI, callWebLLM, elementManager = null) {
    this.callExternalAPI = callExternalAPI;
    this.callWebLLM = callWebLLM;
    this.elementManager = elementManager;
    this.executionMethod = "auto";
  }
  setElementManager(elementManager) {
    this.elementManager = elementManager;
  }
  setExecutionMethod(method) {
    this.executionMethod = method;
  }
  async generateCode(prompt, options = {}) {
    const { includeElementContext = true, availableElements = null, pageContext = null } = options;
    let enhancedPrompt = prompt;
    let elementContext = "";
    let pageContextInfo = "";
    if (pageContext) {
      pageContextInfo = `
## Current Page Context:
- URL: ${pageContext.url}
- Title: ${pageContext.title}${pageContext.selection ? `
- Selected text: "${pageContext.selection}"` : pageContext.visibleText ? `
- Page preview: ${pageContext.visibleText}` : ""}
`;
    }
    if (includeElementContext && this.elementManager) {
      enhancedPrompt = this.elementManager.processElementReferences(prompt);
      if (!prompt.includes("@") && availableElements !== null) {
        const elements = availableElements || this.elementManager.getAllElements();
        if (elements.length > 0) {
          elementContext = this._formatAvailableElements(elements);
        }
      }
    }
    const messages = [
      {
        role: "system",
        content: `Generate JavaScript code that runs in a web browser. Follow these rules:

## Environment:
- This is a WEB BROWSER environment, NOT Node.js
- You have access to standard web APIs: DOM, fetch, window, document, etc.
- Do NOT use Node.js modules like 'require', 'child_process', 'fs', etc.

${pageContextInfo}

## Core Requirements:
- Write ONLY executable statements, NOT function declarations
- Do NOT write: function() { ... } or async function() { ... }
- Do NOT wrap code in functions - just write the statements directly
- Example: document.body.style.backgroundColor = 'red'; return 'done';
- The code will be wrapped in an async function automatically
- You can use 'return' to return values from your code
- You can use await for async operations
- Do NOT wrap code in try-catch (error handling is automatic)

## Element Context:
${elementContext ? `You have access to these stored page elements:
${elementContext}

To interact with these elements, use standard DOM methods:
- document.querySelector('#elementId') or document.querySelector('.className')
- element.click(), element.value, element.textContent, etc.` : "No stored elements are currently available"}

## Important Guidelines:
- For navigation: Use window.location.href = 'url' or window.open()
- For DOM manipulation: Use document.querySelector, getElementById, etc.
- For HTTP requests: Use fetch() with await
- For delays: Use await new Promise(resolve => setTimeout(resolve, ms))
- Return meaningful values when appropriate
- NEVER import external scripts or libraries
- WRITE DIRECT STATEMENTS, NOT FUNCTION DEFINITIONS

EXAMPLE GOOD CODE:
document.body.style.backgroundColor = 'black';
return 'Background changed to black';

EXAMPLE BAD CODE:
async function() { document.body.style.backgroundColor = 'black'; }`
      },
      { role: "user", content: enhancedPrompt }
    ];
    let response;
    try {
      response = await this.callExternalAPI(messages);
    } catch (error) {
      response = await this.callWebLLM(messages);
    }
    let code = response;
    const match = code.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
    if (match)
      code = match[1];
    code = code.replace(/^async\s+function\s*\(\s*\)\s*\{([\s\S]*)\}$/m, "$1");
    code = code.replace(/^function\s*\(\s*\)\s*\{([\s\S]*)\}$/m, "$1");
    return code.trim();
  }
  _formatAvailableElements(elements) {
    if (!elements || elements.length === 0)
      return "";
    return elements.map(({ id, displayName, data, name }) => {
      const selector = data.id ? `#${data.id}` : data.className ? `.${data.className.split(" ")[0]}` : data.tagName;
      const text = data.text ? ` (text: "${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}")` : "";
      return `- @${displayName}: ${selector}${text}`;
    }).join("\n");
  }
  async runCode(code, options = {}) {
    try {
      const isStrictCSP = await this._detectStrictCSP();
      const executionOptions = {
        preferDevTools: this.executionMethod === "devTools" || isStrictCSP,
        forceMethod: this.executionMethod === "auto" ? null : this.executionMethod,
        ...options
      };
      if (isStrictCSP) {
        console.log("Strict CSP site detected, preferring DevTools execution");
      }
      let action = "executeJS";
      if (this.executionMethod === "mainWorld") {
        action = "executeViaMainWorld";
      } else if (this.executionMethod === "devTools") {
        action = "executeViaDevTools";
      }
      const response = await chrome.runtime.sendMessage({
        action,
        code,
        options: executionOptions
      });
      if (response.success) {
        return response.result;
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }
  async execute(prompt, options = {}) {
    const code = await this.generateCode(prompt, options);
    const result = await this.runCode(code, options);
    return { code, result };
  }
  async generateElementInteraction(elementId, action, additionalContext = "", pageContext = null) {
    if (!this.elementManager) {
      throw new Error("Element manager not available");
    }
    const elementData = this.elementManager.getElementData(elementId);
    if (!elementData) {
      throw new Error(`Element @${elementId} not found`);
    }
    const prompt = `${action} the element @${elementId}. ${additionalContext}`.trim();
    return this.generateCode(prompt, { includeElementContext: true, pageContext });
  }
  // Execute with retry logic, trying different methods if needed
  async executeWithRetry(prompt, options = {}, maxRetries = 2) {
    var _a;
    let lastError;
    let methods = ["auto", "mainWorld", "devTools"];
    for (let method of methods) {
      this.setExecutionMethod(method);
      try {
        const result = await this.execute(prompt, options);
        if (result.result && result.result.success !== false) {
          return result;
        }
        lastError = ((_a = result.result) == null ? void 0 : _a.error) || "Unknown error";
      } catch (error) {
        lastError = error.toString();
      }
    }
    return {
      code: "",
      result: {
        success: false,
        error: `Failed with all execution methods. Last error: ${lastError}`
      }
    };
  }
  // Get current execution method info
  async getExecutionInfo() {
    const methods = {
      "auto": "Automatic selection (tries main world first, then DevTools on CSP failure)",
      "mainWorld": "Direct execution in MAIN world (may fail on strict CSP)",
      "devTools": "Chrome DevTools API (most reliable, shows debugger banner)"
    };
    const isStrictCSP = await this._detectStrictCSP();
    return {
      current: this.executionMethod,
      description: methods[this.executionMethod],
      available: Object.keys(methods),
      strictCSPDetected: isStrictCSP,
      recommendedMethod: isStrictCSP ? "devTools" : "auto"
    };
  }
  // Helper method to detect if current page likely has strict CSP
  async _detectStrictCSP() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.url)
        return false;
      const url = new URL(activeTab.url);
      const hostname = url.hostname.toLowerCase();
      const strictCSPDomains = [
        "office365.com",
        "teams.microsoft.com",
        "outlook.com",
        "onedrive.com",
        "sharepoint.com",
        "office.com",
        "live.com",
        "bing.com",
        "delve.office.com",
        "github.com"
        // GitHub also has strict CSP
      ];
      return strictCSPDomains.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );
    } catch (error) {
      return false;
    }
  }
  // Automatically prefer DevTools on strict CSP sites
  async _autoSelectExecutionMethod() {
    if (this.executionMethod !== "auto")
      return;
    const hasStrictCSP = await this._detectStrictCSP();
    if (hasStrictCSP) {
      this.setExecutionMethod("devTools");
    }
  }
};

// src/js-executor-extended.js
var JSExecutorExtended = class extends JSExecutor {
  constructor(externalAI, webllmAI) {
    super(externalAI, webllmAI);
  }
  // Generate undo code for a given JavaScript code
  async generateUndoCode(code) {
    const prompt = `Given this JavaScript code that modifies a webpage:

\`\`\`javascript
${code}
\`\`\`

Generate JavaScript code that would undo/reverse these changes. The undo code should:
1. Restore any modified DOM elements to their previous state
2. Remove any added elements
3. Re-add any removed elements (if possible to track)
4. Restore any changed styles or attributes
5. Remove any added event listeners

If the changes cannot be fully reversed, generate code that does the best possible restoration.

Return ONLY the JavaScript undo code, no explanations.`;
    try {
      const aiResponse = await this.callAI([
        { role: "system", content: "You are a JavaScript expert. Generate only code, no explanations." },
        { role: "user", content: prompt }
      ]);
      let undoCode = aiResponse.trim();
      if (undoCode.startsWith("```")) {
        undoCode = undoCode.replace(/```javascript\n?/, "").replace(/```\n?$/, "");
      }
      return `try {
${undoCode}
} catch (error) {
  console.error('Undo operation failed:', error);
  throw error;
}`;
    } catch (error) {
      console.error("Failed to generate undo code:", error);
      return `// Could not generate specific undo code
console.warn('Undo generation failed, consider refreshing the page');`;
    }
  }
  // Enhanced execute with undo support
  async execute(prompt, context = {}) {
    const { code, result } = await super.execute(prompt, context);
    if (result.success) {
      try {
        const undoCode = await this.generateUndoCode(code);
        result.undoCode = undoCode;
      } catch (error) {
        console.warn("Could not generate undo code:", error);
      }
    }
    return { code, result };
  }
};
var DOMChangeTracker = class {
  constructor() {
    this.changes = [];
    this.observer = null;
  }
  start() {
    this.changes = [];
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        this.recordMutation(mutation);
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
  recordMutation(mutation) {
    const change = {
      type: mutation.type,
      target: this.getSelector(mutation.target),
      timestamp: Date.now()
    };
    switch (mutation.type) {
      case "attributes":
        change.attribute = mutation.attributeName;
        change.oldValue = mutation.oldValue;
        change.newValue = mutation.target.getAttribute(mutation.attributeName);
        break;
      case "childList":
        change.addedNodes = Array.from(mutation.addedNodes).map((node) => ({
          type: node.nodeType,
          content: node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML
        }));
        change.removedNodes = Array.from(mutation.removedNodes).map((node) => ({
          type: node.nodeType,
          content: node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML,
          previousSibling: mutation.previousSibling ? this.getSelector(mutation.previousSibling) : null,
          nextSibling: mutation.nextSibling ? this.getSelector(mutation.nextSibling) : null
        }));
        break;
      case "characterData":
        change.oldValue = mutation.oldValue;
        change.newValue = mutation.target.textContent;
        break;
    }
    this.changes.push(change);
  }
  getSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    if (element.id) {
      return `#${element.id}`;
    }
    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.className) {
        selector += "." + element.className.split(" ").join(".");
      }
      let sibling = element;
      let siblingIndex = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()) {
          siblingIndex++;
        }
      }
      if (siblingIndex > 1) {
        selector += `:nth-of-type(${siblingIndex})`;
      }
      path.unshift(selector);
      element = element.parentElement;
      if (path.length > 3)
        break;
    }
    return path.join(" > ");
  }
  generateUndoCode() {
    const undoSteps = [];
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const change = this.changes[i];
      switch (change.type) {
        case "attributes":
          if (change.oldValue !== null) {
            undoSteps.push(`
              document.querySelector('${change.target}')?.setAttribute('${change.attribute}', '${change.oldValue}');
            `);
          } else {
            undoSteps.push(`
              document.querySelector('${change.target}')?.removeAttribute('${change.attribute}');
            `);
          }
          break;
        case "childList":
          change.addedNodes.forEach((node) => {
            if (node.type === Node.ELEMENT_NODE) {
              undoSteps.push(`
                document.querySelector('${change.target}')?.querySelectorAll('*').forEach(el => {
                  if (el.outerHTML === \`${node.content}\`) el.remove();
                });
              `);
            }
          });
          change.removedNodes.forEach((node) => {
            if (node.type === Node.ELEMENT_NODE && change.target) {
              undoSteps.push(`
                const parent = document.querySelector('${change.target}');
                if (parent && !parent.innerHTML.includes(\`${node.content.substring(0, 50)}\`)) {
                  parent.insertAdjacentHTML('beforeend', \`${node.content}\`);
                }
              `);
            }
          });
          break;
        case "characterData":
          undoSteps.push(`
            const textNode = document.evaluate('${change.target}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (textNode) textNode.textContent = '${change.oldValue}';
          `);
          break;
      }
    }
    return undoSteps.join("\n");
  }
};
export {
  DOMChangeTracker,
  JSExecutorExtended
};
