(() => {
  // src/elementPicker.js
  (() => {
    var ElementManager = class {
      constructor() {
        this.elementStore = /* @__PURE__ */ new Map();
        this.elementCounter = 1;
        this.storageKey = "web_llm_elements";
        this.selectorCache = /* @__PURE__ */ new Map();
        this.mutationObservers = /* @__PURE__ */ new Map();
        this.loadStoredElements();
      }
      // Load elements from Chrome storage
      async loadStoredElements() {
        try {
          const result = await chrome.storage.local.get([this.storageKey]);
          if (result[this.storageKey]) {
            const stored = result[this.storageKey];
            this.elementStore = new Map(stored.elements || []);
            this.elementCounter = stored.counter || 1;
            console.log(`Loaded ${this.elementStore.size} stored elements`);
          }
        } catch (error) {
          console.error("Error loading stored elements:", error);
        }
      }
      // Save elements to Chrome storage
      async saveElements() {
        try {
          const dataToStore = {
            elements: Array.from(this.elementStore.entries()),
            counter: this.elementCounter,
            timestamp: Date.now()
          };
          await chrome.storage.local.set({
            [this.storageKey]: dataToStore
          });
          console.log("Elements saved to storage");
        } catch (error) {
          console.error("Error saving elements:", error);
        }
      }
      // Clear all stored elements
      async clearStoredElements() {
        try {
          this.mutationObservers.forEach((observer) => observer.disconnect());
          this.mutationObservers.clear();
          this.elementStore.clear();
          this.selectorCache.clear();
          this.elementCounter = 1;
          await chrome.storage.local.remove([this.storageKey]);
          console.log("All stored elements cleared");
          return true;
        } catch (error) {
          console.error("Error clearing elements:", error);
          return false;
        }
      }
      // Delete a single element
      async deleteElement(elementId) {
        try {
          if (!this.elementStore.has(elementId)) {
            console.warn(`Element "${elementId}" not found`);
            return false;
          }
          const observer = this.mutationObservers.get(elementId);
          if (observer) {
            observer.disconnect();
            this.mutationObservers.delete(elementId);
          }
          this.elementStore.delete(elementId);
          this.selectorCache.delete(elementId);
          await this.saveElements();
          console.log(`Element "${elementId}" deleted successfully`);
          return true;
        } catch (error) {
          console.error("Error deleting element:", error);
          return false;
        }
      }
      // Add a new element with enhanced tracking
      async addElement(data, options = {}) {
        console.log("ElementManager.addElement called, current counter:", this.elementCounter);
        const elementId = `element${this.elementCounter}`;
        this.elementCounter++;
        const elementData = {
          ...data,
          customName: null,
          defaultId: elementId,
          capturedAt: Date.now(),
          lastVerified: Date.now()
        };
        this.elementStore.set(elementId, elementData);
        if (data.selector && data.trackChanges && options.enableMutationObserver !== false) {
          this.setupElementTracking(elementId, data.selector);
        }
        await this.saveElements();
        console.log("Element added with ID:", elementId, "new counter:", this.elementCounter);
        return { id: elementId, data: elementData };
      }
      // Set up mutation observer for element
      setupElementTracking(elementId, selector) {
        try {
          const element = document.querySelector(selector);
          if (!element)
            return;
          const observer = new MutationObserver((mutations) => {
            this.handleElementMutation(elementId, mutations);
          });
          observer.observe(element, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true
          });
          this.mutationObservers.set(elementId, observer);
        } catch (error) {
          console.error("Error setting up element tracking:", error);
        }
      }
      // Handle element mutations
      handleElementMutation(elementId, mutations) {
        const data = this.elementStore.get(elementId);
        if (!data)
          return;
        const updates = {
          lastModified: Date.now(),
          mutations: mutations.map((m) => ({
            type: m.type,
            attributeName: m.attributeName,
            oldValue: m.oldValue
          }))
        };
        this.elementStore.set(elementId, { ...data, ...updates });
        this.saveElements();
      }
      // Rename an element
      async renameElement(currentName, newName) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
          throw new Error("Invalid name. Use only letters, numbers, and underscores. Must start with a letter.");
        }
        const existingElement = this.findElementByName(newName);
        if (existingElement && existingElement !== currentName) {
          throw new Error(`Name "@${newName}" is already in use.`);
        }
        const elementData = this.elementStore.get(currentName);
        if (!elementData) {
          throw new Error(`Element "@${currentName}" not found.`);
        }
        if (newName !== elementData.defaultId) {
          this.elementStore.delete(currentName);
          elementData.customName = newName;
          this.elementStore.set(newName, elementData);
        } else {
          elementData.customName = null;
          if (currentName !== elementData.defaultId) {
            this.elementStore.delete(currentName);
            this.elementStore.set(elementData.defaultId, elementData);
          }
        }
        await this.saveElements();
        return true;
      }
      // Find element by custom name or default ID
      findElementByName(name) {
        for (const [key, data] of this.elementStore.entries()) {
          if (key === name || data.customName === name) {
            return key;
          }
        }
        return null;
      }
      // Get current name of an element
      getCurrentName(elementKey) {
        const data = this.elementStore.get(elementKey);
        return (data == null ? void 0 : data.customName) || elementKey;
      }
      // Get element data by reference
      getElementData(elementRef) {
        return this.elementStore.get(elementRef);
      }
      // Get all stored elements
      getAllElements() {
        return Array.from(this.elementStore.entries()).map(([id, data]) => ({
          id,
          displayName: data.customName || id,
          data,
          name: data.id ? `#${data.id}` : data.className ? `.${data.className.split(" ")[0]}` : `<${data.tagName}>`
        }));
      }
      // Verify element still exists and update selector if needed
      async verifyElement(elementId) {
        const data = this.elementStore.get(elementId);
        if (!data)
          return false;
        let element = document.querySelector(data.selector);
        if (!element && data.fallbackSelectors) {
          for (const selector of data.fallbackSelectors) {
            element = document.querySelector(selector);
            if (element) {
              data.selector = selector;
              break;
            }
          }
        }
        if (!element && data.contentFingerprint) {
          element = this.findByContentFingerprint(data.contentFingerprint);
          if (element) {
            const picker = new ElementPicker(this);
            const newData = picker.extractElementData(element);
            data.selector = newData.selector;
            data.fallbackSelectors = newData.fallbackSelectors;
          }
        }
        data.lastVerified = Date.now();
        data.isValid = !!element;
        this.elementStore.set(elementId, data);
        await this.saveElements();
        return !!element;
      }
      // Find element by content fingerprint
      findByContentFingerprint(fingerprint) {
        var _a;
        const allElements = document.querySelectorAll(fingerprint.tagName);
        for (const element of allElements) {
          const text = ((_a = element.textContent) == null ? void 0 : _a.trim()) || "";
          const attrs = Array.from(element.attributes).map((a) => `${a.name}=${a.value}`).sort().join("|");
          if (text.includes(fingerprint.textSnippet) || attrs.includes(fingerprint.attributeSignature)) {
            return element;
          }
        }
        return null;
      }
      // Process message to replace element references
      processElementReferences(message) {
        const elementPattern = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let processedMessage = message;
        let foundElements = [];
        message.replace(elementPattern, (match, elementRef) => {
          let elementData = this.getElementData(elementRef);
          if (!elementData) {
            const actualKey = this.findElementByName(elementRef);
            if (actualKey) {
              elementData = this.getElementData(actualKey);
            }
          }
          if (elementData) {
            foundElements.push({ id: elementRef, data: elementData });
          }
          return match;
        });
        if (foundElements.length > 0) {
          processedMessage += "\n\n--- Referenced Elements ---\n";
          foundElements.forEach(({ id, data }) => {
            processedMessage += `
@${id}:
${this.formatElementInfo(data)}
`;
          });
        }
        return processedMessage;
      }
      formatElementInfo(data) {
        const escapeHtml = (unsafe) => {
          return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        };
        const styles = Object.entries(data.styles || {}).filter(([key, value]) => value && value !== "none" && value !== "auto" && value !== "").map(([key, value]) => `  ${key}: ${value}`).join("\n");
        const attributes = Object.entries(data.attributes || {}).map(([key, value]) => `  ${key}: ${value}`).join("\n");
        const examples = data.manipulationExamples ? Object.entries(data.manipulationExamples).map(([action, code]) => `${action}:
${code}`).join("\n\n") : "";
        return `Element: ${data.selector}
${data.fallbackSelectors ? `Fallback Selectors: ${data.fallbackSelectors.join(", ")}` : ""}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ""}
${data.className ? `Classes: ${data.className}` : ""}
${data.xpath ? `XPath: ${data.xpath}` : ""}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ""}
${data.isValid !== void 0 ? `Valid: ${data.isValid}` : ""}
${data.isVisible !== void 0 ? `Visible: ${data.isVisible}` : ""}
${data.isClickable !== void 0 ? `Clickable: ${data.isClickable}` : ""}
${data.isInteractive !== void 0 ? `Interactive: ${data.isInteractive}` : ""}
${data.eventListeners ? `Event Listeners: ${data.eventListeners.join(", ")}` : ""}

HTML:
\`\`\`html
${data.html}
\`\`\`

${data.text ? `Text Content: "${data.text}"` : ""}

${attributes ? `Attributes:
${attributes}
` : ""}

Key Styles:
\`\`\`css
${styles}
\`\`\`

${examples ? `Console Manipulation Examples:
${examples}` : ""}`;
      }
      formatElementSummary(data, elementId) {
        const elementName = data.id ? `#${data.id}` : data.className ? `.${data.className.split(" ")[0]}` : `<${data.tagName}>`;
        const text = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}"` : "";
        const displayName = data.customName || elementId;
        const validity = data.isValid !== void 0 ? data.isValid ? "\u2713" : "\u2717" : "";
        return `\u{1F3AF} **@${displayName}** ${validity} saved: ${elementName}${text} (Type "rename @${displayName} newname" to rename)`;
      }
    };
    var ElementPicker = class {
      constructor(elementManager, options = {}) {
        this.isActive = false;
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
        this.elementManager = elementManager;
        this.currentElement = null;
        this.shadowRoots = /* @__PURE__ */ new WeakMap();
        this.options = {
          showInfoBox: options.showInfoBox !== false,
          // Default true
          enableRightClick: options.enableRightClick !== false,
          // Default true
          enableKeyboardNav: options.enableKeyboardNav !== false,
          // Default true
          ...options
        };
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
      }
      // Core helper methods - defined first to be available throughout the class
      // Check if an ID appears to be dynamically generated
      isDynamicId(id) {
        const dynamicPatterns = [
          /\d{4,}/,
          // Long numbers (timestamps, etc.)
          /[a-f0-9]{8,}/,
          // Hex strings (UUIDs, etc.)
          /^(ember|react|vue|angular)\d+/,
          // Framework-generated IDs
          /^auto_/,
          // Auto-generated prefixes
          /temp|tmp|generated|random/i,
          // Common dynamic keywords
          /_\d+$/,
          // Ending with underscore + number
          /^[a-f0-9-]{36}$/
          // UUID pattern
        ];
        return dynamicPatterns.some((pattern) => pattern.test(id));
      }
      // Check if a class is a utility class that should be avoided
      isUtilityClass(className) {
        const utilityPatterns = [
          /^(m|p)[trblxy]?-\d+$/,
          // margin/padding utilities (m-4, pt-2, etc.)
          /^(w|h)-\d+$/,
          // width/height utilities
          /^text-(xs|sm|base|lg|xl|\d+xl)$/,
          // text size utilities
          /^(flex|grid|block|inline)/,
          // display utilities
          /^(bg|text|border)-(primary|secondary|success|danger|warning|info|light|dark)$/,
          // color utilities
          /^(rounded|shadow|opacity)/,
          // common utility prefixes
          /^(hover|focus|active):/,
          // state prefixes
          /^(sm|md|lg|xl):/,
          // responsive prefixes
          /^d-/,
          // Bootstrap display utilities
          /^col-/,
          // Bootstrap grid
          /^btn-/,
          // Bootstrap button variants (but not 'btn' itself)
          /^alert-/,
          // Bootstrap alert variants
          /^badge-/
          // Bootstrap badge variants
        ];
        return utilityPatterns.some((pattern) => pattern.test(className)) || className.length < 3 || // Very short classes are often utilities
        /^\d/.test(className);
      }
      // Get content-based selector for buttons and links
      getContentSelector(element) {
        var _a, _b;
        const tag = element.tagName.toLowerCase();
        const text = (_a = element.textContent) == null ? void 0 : _a.trim();
        if (tag === "input" && ["submit", "button"].includes(element.type)) {
          const value = (_b = element.value) == null ? void 0 : _b.trim();
          if (value && value.length < 30) {
            const selector = `input[value="${CSS.escape(value)}"]`;
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          }
        }
        if (["button", "a"].includes(tag) && text && text.length < 50) {
          const elements = Array.from(document.querySelectorAll(tag));
          const matches = elements.filter((el) => {
            var _a2;
            return ((_a2 = el.textContent) == null ? void 0 : _a2.trim()) === text;
          });
          if (matches.length === 1) {
            return `${tag} /* text: "${text}" */`;
          }
        }
        if (tag === "input" && element.type === "submit") {
          const form = element.closest("form");
          if (form) {
            if (form.id) {
              return `#${CSS.escape(form.id)} input[type="submit"]`;
            }
            if (form.name) {
              return `form[name="${CSS.escape(form.name)}"] input[type="submit"]`;
            }
          }
        }
        return null;
      }
      // Get CSS path for an element
      getCSSPath(element) {
        const path = [];
        let current = element;
        while (current && current !== document.documentElement) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector += `#${CSS.escape(current.id)}`;
            path.unshift(selector);
            break;
          }
          if (current.className) {
            const classes = current.className.trim().split(/\s+/);
            if (classes.length > 0) {
              selector += "." + classes.map((c) => CSS.escape(c)).join(".");
            }
          }
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter((el) => el.tagName === current.tagName);
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              selector += `:nth-of-type(${index})`;
            }
          }
          path.unshift(selector);
          current = parent;
        }
        return path.join(" > ");
      }
      // Check if element is focusable
      isFocusable(element) {
        const focusableTags = ["input", "textarea", "select", "button", "a"];
        return focusableTags.includes(element.tagName.toLowerCase()) || element.tabIndex >= 0 || element.isContentEditable;
      }
      start() {
        if (this.isActive)
          return;
        console.log("Starting advanced element picker...");
        this.isActive = true;
        this.scanForShadowRoots();
        this.createUI();
        this.attachEvents();
        document.body.style.cursor = "crosshair";
      }
      stop() {
        if (!this.isActive)
          return;
        console.log("Stopping element picker...");
        this.isActive = false;
        this.removeUI();
        this.detachEvents();
        document.body.style.cursor = "";
        this.currentElement = null;
      }
      // Scan for shadow roots in the document
      scanForShadowRoots() {
        const elements = document.querySelectorAll("*");
        elements.forEach((el) => {
          if (el.shadowRoot) {
            this.shadowRoots.set(el, el.shadowRoot);
          }
        });
      }
      createUI() {
        this.overlay = document.createElement("div");
        this.overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.01) !important;
            z-index: 999999 !important;
            cursor: crosshair !important;
            pointer-events: all !important;
        `;
        this.highlightBox = document.createElement("div");
        this.highlightBox.style.cssText = `
            position: absolute !important;
            border: 2px solid #ff6b35 !important;
            background: rgba(255, 107, 53, 0.1) !important;
            z-index: 1000000 !important;
            pointer-events: none !important;
            display: none !important;
            box-shadow: 0 0 10px rgba(255, 107, 53, 0.5) !important;
            transition: all 0.1s ease !important;
        `;
        if (this.options.showInfoBox) {
          this.infoBox = document.createElement("div");
          this.infoBox.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                background: rgba(0, 0, 0, 0.9) !important;
                color: white !important;
                padding: 12px 16px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                font-family: monospace !important;
                z-index: 1000001 !important;
                pointer-events: none !important;
                display: none !important;
                max-width: 400px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            `;
        }
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlightBox);
        if (this.infoBox)
          document.body.appendChild(this.infoBox);
      }
      removeUI() {
        if (this.overlay)
          this.overlay.remove();
        if (this.highlightBox)
          this.highlightBox.remove();
        if (this.infoBox)
          this.infoBox.remove();
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
      }
      attachEvents() {
        document.addEventListener("mousemove", this.onMouseMove, true);
        document.addEventListener("click", this.onClick, true);
        if (this.options.enableRightClick) {
          document.addEventListener("contextmenu", this.onContextMenu, true);
        }
        if (this.options.enableKeyboardNav) {
          document.addEventListener("keydown", this.onKeyDown, true);
        }
      }
      detachEvents() {
        document.removeEventListener("mousemove", this.onMouseMove, true);
        document.removeEventListener("click", this.onClick, true);
        if (this.options.enableRightClick) {
          document.removeEventListener("contextmenu", this.onContextMenu, true);
        }
        if (this.options.enableKeyboardNav) {
          document.removeEventListener("keydown", this.onKeyDown, true);
        }
      }
      onMouseMove(e) {
        if (!this.isActive)
          return;
        const element = this.getElementAtPoint(e.clientX, e.clientY);
        if (element && element !== this.highlightBox && element !== this.infoBox) {
          this.currentElement = element;
          this.highlightElement(element);
          if (this.options.showInfoBox) {
            this.showElementInfo(element);
          }
        }
      }
      onClick(e) {
        if (!this.isActive)
          return;
        e.preventDefault();
        e.stopPropagation();
        if (this.currentElement) {
          this.selectElement(this.currentElement);
        }
      }
      onContextMenu(e) {
        if (!this.isActive)
          return;
        e.preventDefault();
        e.stopPropagation();
        if (this.currentElement && this.currentElement.parentElement) {
          this.currentElement = this.currentElement.parentElement;
          this.highlightElement(this.currentElement);
          this.showElementInfo(this.currentElement);
        }
      }
      onKeyDown(e) {
        if (e.key === "Escape") {
          this.stop();
        } else if (this.options.enableKeyboardNav && e.key === "Enter" && this.currentElement) {
          e.preventDefault();
          this.selectElement(this.currentElement);
        }
      }
      // Get element at point including shadow DOM
      getElementAtPoint(x, y) {
        this.overlay.style.display = "none";
        let element = document.elementFromPoint(x, y);
        if (element) {
          const shadowRoot = this.shadowRoots.get(element);
          if (shadowRoot) {
            const shadowElement = shadowRoot.elementFromPoint(x, y);
            if (shadowElement)
              element = shadowElement;
          }
        }
        this.overlay.style.display = "block";
        return element;
      }
      highlightElement(element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        this.highlightBox.style.cssText = `
            position: absolute !important;
            left: ${rect.left + scrollX}px !important;
            top: ${rect.top + scrollY}px !important;
            width: ${rect.width}px !important;
            height: ${rect.height}px !important;
            border: 2px solid #ff6b35 !important;
            background: rgba(255, 107, 53, 0.1) !important;
            z-index: 1000000 !important;
            pointer-events: none !important;
            display: block !important;
            box-shadow: 0 0 10px rgba(255, 107, 53, 0.5) !important;
        `;
      }
      showElementInfo(element) {
        var _a;
        const selector = this.getOptimalSelector(element);
        const tagName = element.tagName.toLowerCase();
        const text = ((_a = element.textContent) == null ? void 0 : _a.trim().slice(0, 30)) || "";
        this.infoBox.innerHTML = `
            <div style="color: #ff6b35; font-weight: bold; margin-bottom: 4px;">Element Info</div>
            <div>Tag: &lt;${tagName}&gt;</div>
            <div>Selector: ${selector}</div>
            ${text ? `<div>Text: "${text}..."</div>` : ""}
            <div style="margin-top: 8px; color: #888;">Click to select | Right-click for parent | ESC to cancel</div>
        `;
        this.infoBox.style.display = "block";
      }
      selectElement(element) {
        console.log("Element selected:", element);
        const data = this.extractElementData(element);
        this.stop();
        chrome.runtime.sendMessage({
          action: "elementSelected",
          data
        });
      }
      extractElementData(element) {
        var _a;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const selectors = this.generateSelectors(element);
        const eventListeners = this.detectEventListeners(element);
        const contentFingerprint = this.createContentFingerprint(element);
        const accessibilityInfo = this.getAccessibilityInfo(element);
        const data = {
          // Basic info
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          className: element.className || null,
          selector: selectors.primary,
          fallbackSelectors: selectors.fallbacks,
          xpath: this.getXPath(element),
          cssPath: this.getCSSPath(element),
          text: ((_a = element.textContent) == null ? void 0 : _a.trim().slice(0, 200)) || null,
          html: element.outerHTML.length > 1e3 ? element.outerHTML.slice(0, 1e3) + "..." : element.outerHTML,
          // Position and dimensions
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            viewport: {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left
            },
            document: {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY
            }
          },
          // Extended styles
          styles: {
            display: style.display,
            position: style.position,
            width: style.width,
            height: style.height,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            opacity: style.opacity,
            visibility: style.visibility,
            zIndex: style.zIndex,
            cursor: style.cursor,
            overflow: style.overflow,
            border: style.border,
            padding: style.padding,
            margin: style.margin,
            transform: style.transform,
            transition: style.transition,
            boxShadow: style.boxShadow,
            borderRadius: style.borderRadius,
            pointerEvents: style.pointerEvents
          },
          // Interaction properties
          isVisible: this.isElementVisible(element),
          isClickable: this.isElementClickable(element),
          isInteractive: this.isElementInteractive(element),
          isInViewport: this.isInViewport(element),
          isFocusable: this.isFocusable(element),
          // Event listeners
          eventListeners,
          hasClickHandler: eventListeners.includes("click"),
          // All attributes
          attributes: this.getAttributes(element),
          dataAttributes: this.getDataAttributes(element),
          // Form properties
          formProperties: this.getFormProperties(element),
          // Context
          parentContext: this.getParentContext(element),
          siblingContext: this.getSiblingContext(element),
          // Accessibility
          accessibility: accessibilityInfo,
          // Content fingerprint for tracking
          contentFingerprint,
          // Shadow DOM info
          isInShadowDOM: this.isInShadowDOM(element),
          shadowRoot: element.shadowRoot ? true : false,
          // Frame info
          frameInfo: this.getFrameInfo(element),
          // Advanced manipulation examples
          manipulationExamples: this.generateAdvancedManipulationExamples(element, selectors.primary),
          // Tracking preferences (disabled by default for backward compatibility)
          trackChanges: false
        };
        return data;
      }
      // Generate multiple selector strategies
      generateSelectors(element) {
        const selectors = {
          primary: null,
          fallbacks: []
        };
        if (element.id && !this.isDynamicId(element.id)) {
          selectors.primary = `#${CSS.escape(element.id)}`;
          return selectors;
        }
        const simpleSelector = this.getSimpleAttributeSelector(element);
        if (simpleSelector) {
          selectors.primary = simpleSelector;
          return selectors;
        }
        const classSelector = this.getUniqueClassSelector(element);
        if (classSelector) {
          selectors.primary = classSelector;
          return selectors;
        }
        const contentSelector = this.getContentSelector(element);
        if (contentSelector) {
          selectors.primary = contentSelector;
          return selectors;
        }
        selectors.primary = this.getSimplePositionSelector(element);
        return selectors;
      }
      // New: Get simple attribute-based selector
      getSimpleAttributeSelector(element) {
        const attrs = ["name", "type", "placeholder", "value", "title", "alt", "aria-label", "role"];
        const tag = element.tagName.toLowerCase();
        for (const attr of attrs) {
          const value = element.getAttribute(attr);
          if (value && value.length < 50 && value.length > 0) {
            const selector = `${tag}[${attr}="${CSS.escape(value)}"]`;
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
            if (["button", "input"].includes(tag) && ["type", "value", "aria-label"].includes(attr)) {
              const simpleSelector = `[${attr}="${CSS.escape(value)}"]`;
              if (document.querySelectorAll(simpleSelector).length === 1) {
                return simpleSelector;
              }
            }
          }
        }
        if (tag === "input" && element.type === "submit") {
          if (document.querySelectorAll('input[type="submit"]').length === 1) {
            return 'input[type="submit"]';
          }
        }
        return null;
      }
      // New: Get unique class selector (single class only)
      getUniqueClassSelector(element) {
        if (!element.className || typeof element.className !== "string")
          return null;
        const classes = element.className.trim().split(/\s+/).filter((c) => c && !this.isUtilityClass(c));
        const tag = element.tagName.toLowerCase();
        for (const cls of classes) {
          const selector = `.${CSS.escape(cls)}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
          const tagClassSelector = `${tag}.${CSS.escape(cls)}`;
          if (document.querySelectorAll(tagClassSelector).length === 1) {
            return tagClassSelector;
          }
        }
        return null;
      }
      // Modified: Simpler position selector (max 2 levels)
      getSimplePositionSelector(element) {
        const tag = element.tagName.toLowerCase();
        const allOfType = document.querySelectorAll(tag);
        if (allOfType.length === 1) {
          return tag;
        }
        if (allOfType.length <= 3) {
          const index = Array.from(allOfType).indexOf(element) + 1;
          return `${tag}:nth-of-type(${index})`;
        }
        let parent = element.parentElement;
        if (parent && parent.id && !this.isDynamicId(parent.id)) {
          const selector = `#${CSS.escape(parent.id)} > ${tag}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
          const siblings = Array.from(parent.children).filter((el) => el.tagName === element.tagName);
          if (siblings.length <= 3) {
            const index = siblings.indexOf(element) + 1;
            return `#${CSS.escape(parent.id)} > ${tag}:nth-of-type(${index})`;
          }
        }
        if (parent && parent.className) {
          const parentClasses = parent.className.trim().split(/\s+/).filter((c) => c && !this.isUtilityClass(c));
          for (const cls of parentClasses) {
            const selector = `.${CSS.escape(cls)} > ${tag}`;
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
            const siblings = Array.from(parent.children).filter((el) => el.tagName === element.tagName);
            if (siblings.length <= 3) {
              const index = siblings.indexOf(element) + 1;
              const selectorWithIndex = `.${CSS.escape(cls)} > ${tag}:nth-of-type(${index})`;
              if (document.querySelectorAll(selectorWithIndex).length === 1) {
                return selectorWithIndex;
              }
            }
          }
        }
        if (parent) {
          const siblings = Array.from(parent.children).filter((el) => el.tagName === element.tagName);
          if (siblings.length <= 5) {
            const index = siblings.indexOf(element) + 1;
            return `${tag}:nth-of-type(${index})`;
          }
        }
        return tag;
      }
      // Additional core methods
      // Get XPath for an element
      getXPath(element) {
        const path = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let sibling = current.previousSibling;
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }
          const tagName = current.tagName.toLowerCase();
          const step = `${tagName}[${index}]`;
          path.unshift(step);
          current = current.parentElement;
        }
        return `//${path.join("/")}`;
      }
      // Get optimal selector using the new strategy
      getOptimalSelector(element) {
        return this.generateSelectors(element).primary;
      }
      // Element visibility and interaction checks
      isElementVisible(element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return !!(rect.width > 0 && rect.height > 0 && style.opacity !== "0" && style.visibility !== "hidden" && style.display !== "none" && element.offsetParent !== null);
      }
      isElementClickable(element) {
        const clickableTags = ["a", "button", "input", "select", "textarea", "label"];
        const clickableRoles = ["button", "link", "checkbox", "radio", "menuitem", "tab"];
        const tagName = element.tagName.toLowerCase();
        return !!(clickableTags.includes(tagName) || element.onclick || element.getAttribute("onclick") || clickableRoles.includes(element.getAttribute("role")) || getComputedStyle(element).cursor === "pointer" || element.hasAttribute("data-clickable") || element.classList.contains("clickable") || element.classList.contains("btn"));
      }
      isElementInteractive(element) {
        return !!(element.isContentEditable || element.getAttribute("contenteditable") === "true" || ["input", "textarea", "select"].includes(element.tagName.toLowerCase()) || element.tabIndex >= 0 || element.hasAttribute("draggable") || element.hasAttribute("droppable"));
      }
      isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
      }
      // Element attribute helpers
      getAttributes(element) {
        const attrs = {};
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      }
      getDataAttributes(element) {
        const dataAttrs = {};
        for (const attr of element.attributes) {
          if (attr.name.startsWith("data-")) {
            dataAttrs[attr.name] = attr.value;
          }
        }
        return dataAttrs;
      }
      getFormProperties(element) {
        const tagName = element.tagName.toLowerCase();
        if (["input", "textarea", "select"].includes(tagName)) {
          return {
            type: element.type || null,
            name: element.name || null,
            value: element.value || null,
            placeholder: element.placeholder || null,
            required: element.required || false,
            disabled: element.disabled || false,
            readonly: element.readOnly || false,
            checked: element.checked || false,
            maxLength: element.maxLength || null,
            min: element.min || null,
            max: element.max || null,
            pattern: element.pattern || null,
            autocomplete: element.autocomplete || null,
            form: element.form ? element.form.id || element.form.name : null
          };
        }
        return null;
      }
      getParentContext(element) {
        const parent = element.parentElement;
        if (!parent || parent === document.body)
          return null;
        return {
          tagName: parent.tagName.toLowerCase(),
          id: parent.id || null,
          className: parent.className || null,
          selector: this.getOptimalSelector(parent)
        };
      }
      // Additional helper methods for element analysis
      detectEventListeners(element) {
        const listeners = [];
        const eventAttrs = ["onclick", "onmouseover", "onmouseout", "onchange", "onsubmit", "onfocus", "onblur"];
        eventAttrs.forEach((attr) => {
          if (element.hasAttribute(attr)) {
            listeners.push(attr.substring(2));
          }
        });
        if (element.style.cursor === "pointer")
          listeners.push("click");
        if (element.tagName.toLowerCase() === "a")
          listeners.push("click");
        if (element.tagName.toLowerCase() === "button")
          listeners.push("click");
        if (element.type === "submit")
          listeners.push("submit");
        if (["input", "textarea", "select"].includes(element.tagName.toLowerCase())) {
          listeners.push("change", "input");
        }
        return [...new Set(listeners)];
      }
      createContentFingerprint(element) {
        var _a;
        const text = ((_a = element.textContent) == null ? void 0 : _a.trim()) || "";
        const attributes = Array.from(element.attributes).map((a) => `${a.name}=${a.value}`).sort().join("|");
        return {
          tagName: element.tagName.toLowerCase(),
          textSnippet: text.slice(0, 50),
          attributeSignature: attributes.slice(0, 100),
          classCount: element.classList.length,
          childCount: element.children.length
        };
      }
      getAccessibilityInfo(element) {
        return {
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          ariaDescribedBy: element.getAttribute("aria-describedby"),
          ariaExpanded: element.getAttribute("aria-expanded"),
          ariaHidden: element.getAttribute("aria-hidden"),
          tabIndex: element.tabIndex,
          alt: element.getAttribute("alt"),
          title: element.getAttribute("title")
        };
      }
      isInShadowDOM(element) {
        let current = element;
        while (current) {
          if (current.getRootNode() !== document) {
            return true;
          }
          current = current.parentElement;
        }
        return false;
      }
      getFrameInfo(element) {
        return {
          isInFrame: window !== window.top,
          frameDepth: this.getFrameDepth(),
          frameOrigin: window.location.origin
        };
      }
      getFrameDepth() {
        let depth = 0;
        let current = window;
        try {
          while (current !== current.parent) {
            depth++;
            current = current.parent;
          }
        } catch (e) {
        }
        return depth;
      }
      getSiblingContext(element) {
        var _a, _b;
        const parent = element.parentElement;
        if (!parent)
          return null;
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element);
        return {
          totalSiblings: siblings.length,
          index,
          isFirst: index === 0,
          isLast: index === siblings.length - 1,
          previousSibling: ((_a = siblings[index - 1]) == null ? void 0 : _a.tagName.toLowerCase()) || null,
          nextSibling: ((_b = siblings[index + 1]) == null ? void 0 : _b.tagName.toLowerCase()) || null
        };
      }
      generateAdvancedManipulationExamples(element, selector) {
        const examples = {};
        const tagName = element.tagName.toLowerCase();
        examples["Click"] = `document.querySelector('${selector}').click()`;
        examples["Focus"] = `document.querySelector('${selector}').focus()`;
        if (["input", "textarea"].includes(tagName)) {
          examples["Set Value"] = `document.querySelector('${selector}').value = 'new value'`;
          examples["Clear"] = `document.querySelector('${selector}').value = ''`;
        }
        if (element.type === "checkbox" || element.type === "radio") {
          examples["Check"] = `document.querySelector('${selector}').checked = true`;
          examples["Uncheck"] = `document.querySelector('${selector}').checked = false`;
        }
        if (tagName === "select") {
          examples["Select Option"] = `document.querySelector('${selector}').value = 'option-value'`;
        }
        examples["Hide"] = `document.querySelector('${selector}').style.display = 'none'`;
        examples["Show"] = `document.querySelector('${selector}').style.display = 'block'`;
        examples["Change Text"] = `document.querySelector('${selector}').textContent = 'New text'`;
        examples["Trigger Change"] = `document.querySelector('${selector}').dispatchEvent(new Event('change'))`;
        return examples;
      }
    };
    window.ElementPicker = ElementPicker;
    window.ElementManager = ElementManager;
  })();
})();
