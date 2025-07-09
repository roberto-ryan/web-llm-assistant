import { ElementPicker as DOMElementPicker } from 'pick-dom-element';
import { getCssSelector } from 'css-selector-generator';
import { isVisible } from 'dom-helpers';
import { debounce } from 'lodash-es';
import localforage from 'localforage';

(() => {
  // Configure localforage for element storage
  const elementStorage = localforage.createInstance({
    name: 'web-llm-elements',
    storeName: 'elements',
    description: 'Stored DOM elements for Web LLM Assistant'
  });

  // Enhanced ElementManager with localforage
  class ElementManager {
    constructor() {
      this.elementStore = new Map();
      this.elementCounter = 1;
      this.mutationObservers = new Map();
      this.loadStoredElements();
    }

    // Load elements from localforage
    async loadStoredElements() {
      try {
        const stored = await elementStorage.getItem('elementData');
        if (stored) {
          this.elementStore = new Map(stored.elements || []);
          this.elementCounter = stored.counter || 1;
          console.log(`Loaded ${this.elementStore.size} stored elements`);
        }
      } catch (error) {
        console.error("Error loading stored elements:", error);
      }
    }

    // Save elements to localforage with debouncing
    saveElements = debounce(async () => {
      try {
        const dataToStore = {
          elements: Array.from(this.elementStore.entries()),
          counter: this.elementCounter,
          timestamp: Date.now()
        };
        await elementStorage.setItem('elementData', dataToStore);
        console.log("Elements saved to storage");
      } catch (error) {
        console.error("Error saving elements:", error);
      }
    }, 300);

    // Clear all stored elements
    async clearStoredElements() {
      try {
        this.mutationObservers.forEach((observer) => observer.disconnect());
        this.mutationObservers.clear();
        this.elementStore.clear();
        this.elementCounter = 1;
        await elementStorage.clear();
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
        await this.saveElements();
        console.log(`Element "${elementId}" deleted successfully`);
        return true;
      } catch (error) {
        console.error("Error deleting element:", error);
        return false;
      }
    }

    // Add a new element
    async addElement(data, options = {}) {
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
      
      // Set up mutation observer if tracking is enabled
      if (data.selector && data.trackChanges && options.enableMutationObserver !== false) {
        this.setupElementTracking(elementId, data.selector);
      }
      
      await this.saveElements();
      console.log("Element added with ID:", elementId);
      return { id: elementId, data: elementData };
    }

    // Setup IntersectionObserver for element tracking
    setupElementTracking(elementId, selector) {
      try {
        const element = document.querySelector(selector);
        if (!element) return;

        // Use IntersectionObserver for performance
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const data = this.elementStore.get(elementId);
            if (data) {
              data.lastModified = Date.now();
              data.isVisible = entry.isIntersecting;
              data.intersectionRatio = entry.intersectionRatio;
              data.boundingClientRect = entry.boundingClientRect;
              this.elementStore.set(elementId, data);
              this.saveElements();
            }
          });
        }, {
          threshold: [0, 0.25, 0.5, 0.75, 1]
        });

        observer.observe(element);
        this.mutationObservers.set(elementId, observer);
      } catch (error) {
        console.error("Error setting up element tracking:", error);
      }
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
        name: data.id ? `#${data.id}` : data.className ? `.${data.className.toString().split(" ")[0]}` : `<${data.tagName}>`
      }));
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

    // Format element info for display
    formatElementInfo(data) {
      const styles = Object.entries(data.styles || {})
        .filter(([, value]) => value && value !== "none" && value !== "auto" && value !== "")
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n");
      
      const attributes = Object.entries(data.attributes || {})
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n");
      
      return `Element: ${data.selector}
${data.fallbackSelectors ? `Fallback Selectors: ${data.fallbackSelectors.join(", ")}` : ""}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ""}
${data.className ? `Classes: ${data.className}` : ""}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ""}
${data.isVisible !== undefined ? `Visible: ${data.isVisible}` : ""}

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
\`\`\``;
    }

    // Format element summary
    formatElementSummary(data, elementId) {
      const elementName = data.id ? `#${data.id}` : data.className ? `.${data.className.toString().split(" ")[0]}` : `<${data.tagName}>`;
      const text = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}"` : "";
      const displayName = data.customName || elementId;
      const validity = data.isValid !== undefined ? (data.isValid ? "✓" : "✗") : "";
      return `🎯 **@${displayName}** ${validity} saved: ${elementName}${text} (Type "rename @${displayName} newname" to rename)`;
    }
  }

  // Simplified ElementPicker using pick-dom-element
  class ElementPicker {
    constructor(elementManager, options = {}) {
      this.elementManager = elementManager;
      this.options = {
        borderColor: '#ff6b35',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        ...options
      };
      this.picker = null;
      this.isActive = false;
    }

    start() {
      if (this.isActive) return;
      
      console.log("Starting modern element picker...");
      this.isActive = true;
      
      // Create picker with custom styling
      this.picker = new DOMElementPicker({
        style: {
          borderColor: this.options.borderColor,
          backgroundColor: this.options.backgroundColor,
          borderWidth: '2px',
          borderStyle: 'solid'
        }
      });
      
      // Start picking
      this.picker.start({
        onHover: (element) => {
          // Optional: Show element info on hover
          this.showElementPreview(element);
        },
        onClick: (element) => {
          this.selectElement(element);
          this.stop();
        }
      });
      
      document.body.style.cursor = "crosshair";
    }

    stop() {
      if (!this.isActive) return;
      
      console.log("Stopping element picker...");
      this.isActive = false;
      
      if (this.picker) {
        this.picker.stop();
        this.picker = null;
      }
      
      document.body.style.cursor = "";
    }

    showElementPreview(element) {
      // Optional: Could show a tooltip with element info
      const selector = this.getOptimalSelector(element);
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.trim().slice(0, 30) || "";
      
      console.log(`Hovering: <${tagName}> ${selector} ${text ? `"${text}..."` : ""}`);
    }

    selectElement(element) {
      console.log("Element selected:", element);
      const data = this.extractElementData(element);
      
      chrome.runtime.sendMessage({
        action: "elementSelected",
        data
      });
    }

    // Extract comprehensive element data
    extractElementData(element) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const selector = this.getOptimalSelector(element);
      
      return {
        // Basic info
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.className || null,
        selector,
        fallbackSelectors: this.generateFallbackSelectors(element),
        text: element.textContent?.trim().slice(0, 200) || null,
        html: element.outerHTML.length > 1000 ? element.outerHTML.slice(0, 1000) + "..." : element.outerHTML,
        
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
          }
        },
        
        // Key styles
        styles: {
          display: style.display,
          position: style.position,
          width: style.width,
          height: style.height,
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize,
          opacity: style.opacity,
          visibility: style.visibility,
          cursor: style.cursor
        },
        
        // Interaction properties
        isVisible: isVisible(element),
        isClickable: this.isElementClickable(element),
        isInteractive: this.isElementInteractive(element),
        
        // All attributes
        attributes: this.getAttributes(element),
        
        // Form properties
        formProperties: this.getFormProperties(element),
        
        // Advanced manipulation examples
        manipulationExamples: this.generateManipulationExamples(element, selector),
        
        // Tracking preferences
        trackChanges: false
      };
    }

    // Get optimal selector using css-selector-generator
    getOptimalSelector(element) {
      try {
        return getCssSelector(element, {
          selectors: ['id', 'class', 'tag', 'attribute', 'nthchild'],
          blacklist: [/^[a-f0-9]{6,}$/i, /temp|tmp|generated|random/i, /^auto_/],
          root: document.body,
          combineWithinSelector: true,
          includeTag: true
        });
      } catch (error) {
        console.warn('css-selector-generator failed:', error);
        return this.getSimpleSelector(element);
      }
    }

    // Simple fallback selector
    getSimpleSelector(element) {
      if (element.id) return `#${CSS.escape(element.id)}`;
      if (element.className) {
        const classes = element.className.toString().trim().split(/\s+/);
        if (classes.length > 0) {
          return `.${CSS.escape(classes[0])}`;
        }
      }
      return element.tagName.toLowerCase();
    }

    // Generate fallback selectors
    generateFallbackSelectors(element) {
      const fallbacks = [];
      
      // Add simple selectors
      if (element.id) fallbacks.push(`#${CSS.escape(element.id)}`);
      if (element.className) {
        const classes = element.className.toString().trim().split(/\s+/);
        fallbacks.push(...classes.map(cls => `.${CSS.escape(cls)}`));
      }
      
      // Add attribute selectors
      ['name', 'type', 'placeholder', 'aria-label'].forEach(attr => {
        const value = element.getAttribute(attr);
        if (value) {
          fallbacks.push(`[${attr}="${CSS.escape(value)}"]`);
        }
      });
      
      return [...new Set(fallbacks)];
    }

    // Check if element is clickable
    isElementClickable(element) {
      const clickableTags = ["a", "button", "input", "select", "textarea", "label"];
      const clickableRoles = ["button", "link", "checkbox", "radio", "menuitem", "tab"];
      
      return clickableTags.includes(element.tagName.toLowerCase()) ||
             element.onclick ||
             element.getAttribute("onclick") ||
             clickableRoles.includes(element.getAttribute("role")) ||
             getComputedStyle(element).cursor === "pointer";
    }

    // Check if element is interactive
    isElementInteractive(element) {
      return element.isContentEditable ||
             element.getAttribute("contenteditable") === "true" ||
             ["input", "textarea", "select"].includes(element.tagName.toLowerCase()) ||
             element.tabIndex >= 0;
    }

    // Get all attributes
    getAttributes(element) {
      return Array.from(element.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {});
    }

    // Get form properties
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
          checked: element.checked || false
        };
      }
      return null;
    }

    // Generate manipulation examples
    generateManipulationExamples(element, selector) {
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
      
      return examples;
    }
  }

  // Export to global scope
  window.ElementPicker = ElementPicker;
  window.ElementManager = ElementManager;
})();