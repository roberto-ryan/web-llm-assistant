// Advanced Element Management Service
class ElementManager {
    constructor() {
        this.elementStore = new Map();
        this.elementCounter = 1;
        this.storageKey = 'web_llm_elements';
        this.selectorCache = new Map();
        this.mutationObservers = new Map();
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
            console.error('Error loading stored elements:', error);
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
            
            console.log('Elements saved to storage');
        } catch (error) {
            console.error('Error saving elements:', error);
        }
    }
    
    // Clear all stored elements
    async clearStoredElements() {
        try {
            // Stop all mutation observers
            this.mutationObservers.forEach(observer => observer.disconnect());
            this.mutationObservers.clear();
            
            this.elementStore.clear();
            this.selectorCache.clear();
            this.elementCounter = 1;
            await chrome.storage.local.remove([this.storageKey]);
            console.log('All stored elements cleared');
            return true;
        } catch (error) {
            console.error('Error clearing elements:', error);
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
            
            // Stop mutation observer if exists
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
            console.error('Error deleting element:', error);
            return false;
        }
    }
    
    // Add a new element with enhanced tracking
    async addElement(data, options = {}) {
        console.log('ElementManager.addElement called, current counter:', this.elementCounter);
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
        
        // Set up mutation observer for element tracking (optional)
        if (data.selector && data.trackChanges && options.enableMutationObserver !== false) {
            this.setupElementTracking(elementId, data.selector);
        }
        
        await this.saveElements();
        
        console.log('Element added with ID:', elementId, 'new counter:', this.elementCounter);
        return { id: elementId, data: elementData };
    }
    
    // Set up mutation observer for element
    setupElementTracking(elementId, selector) {
        try {
            const element = document.querySelector(selector);
            if (!element) return;
            
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
            console.error('Error setting up element tracking:', error);
        }
    }
    
    // Handle element mutations
    handleElementMutation(elementId, mutations) {
        const data = this.elementStore.get(elementId);
        if (!data) return;
        
        const updates = {
            lastModified: Date.now(),
            mutations: mutations.map(m => ({
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
        return data?.customName || elementKey;
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
            name: data.id ? `#${data.id}` : 
                  data.className ? `.${data.className.split(' ')[0]}` : 
                  `<${data.tagName}>`
        }));
    }
    
    // Verify element still exists and update selector if needed
    async verifyElement(elementId) {
        const data = this.elementStore.get(elementId);
        if (!data) return false;
        
        // Try primary selector
        let element = document.querySelector(data.selector);
        
        // Try fallback selectors
        if (!element && data.fallbackSelectors) {
            for (const selector of data.fallbackSelectors) {
                element = document.querySelector(selector);
                if (element) {
                    data.selector = selector;
                    break;
                }
            }
        }
        
        // Try content-based search
        if (!element && data.contentFingerprint) {
            element = this.findByContentFingerprint(data.contentFingerprint);
            if (element) {
                // Update selector
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
        const allElements = document.querySelectorAll(fingerprint.tagName);
        
        for (const element of allElements) {
            const text = element.textContent?.trim() || '';
            const attrs = Array.from(element.attributes)
                .map(a => `${a.name}=${a.value}`)
                .sort()
                .join('|');
                
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
            processedMessage += '\n\n--- Referenced Elements ---\n';
            foundElements.forEach(({ id, data }) => {
                processedMessage += `\n@${id}:\n${this.formatElementInfo(data)}\n`;
            });
        }
        
        return processedMessage;
    }
    
    formatElementInfo(data) {
        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        
        const styles = Object.entries(data.styles || {})
            .filter(([key, value]) => value && value !== 'none' && value !== 'auto' && value !== '')
            .map(([key, value]) => `  ${key}: ${value}`)
            .join('\n');
        
        const attributes = Object.entries(data.attributes || {})
            .map(([key, value]) => `  ${key}: ${value}`)
            .join('\n');
        
        const examples = data.manipulationExamples ? 
            Object.entries(data.manipulationExamples)
                .map(([action, code]) => `${action}:\n${code}`)
                .join('\n\n') : '';
            
        return `Element: ${data.selector}
${data.fallbackSelectors ? `Fallback Selectors: ${data.fallbackSelectors.join(', ')}` : ''}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ''}
${data.className ? `Classes: ${data.className}` : ''}
${data.xpath ? `XPath: ${data.xpath}` : ''}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ''}
${data.isValid !== undefined ? `Valid: ${data.isValid}` : ''}
${data.isVisible !== undefined ? `Visible: ${data.isVisible}` : ''}
${data.isClickable !== undefined ? `Clickable: ${data.isClickable}` : ''}
${data.isInteractive !== undefined ? `Interactive: ${data.isInteractive}` : ''}
${data.eventListeners ? `Event Listeners: ${data.eventListeners.join(', ')}` : ''}

HTML:
\`\`\`html
${data.html}
\`\`\`

${data.text ? `Text Content: "${data.text}"` : ''}

${attributes ? `Attributes:\n${attributes}\n` : ''}

Key Styles:
\`\`\`css
${styles}
\`\`\`

${examples ? `Console Manipulation Examples:\n${examples}` : ''}`;
    }
    
    formatElementSummary(data, elementId) {
        const elementName = data.id ? `#${data.id}` : 
                           data.className ? `.${data.className.split(' ')[0]}` : 
                           `<${data.tagName}>`;
        
        const text = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? '...' : ''}"` : '';
        const displayName = data.customName || elementId;
        const validity = data.isValid !== undefined ? (data.isValid ? '✓' : '✗') : '';
        
        return `🎯 **@${displayName}** ${validity} saved: ${elementName}${text} (Type "rename @${displayName} newname" to rename)`;
    }
}

// Advanced Element Picker with robust selection and tracking
class ElementPicker {
    constructor(elementManager, options = {}) {
        this.isActive = false;
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
        this.elementManager = elementManager;
        this.currentElement = null;
        this.shadowRoots = new WeakMap();
        
        // Options for backward compatibility
        this.options = {
            showInfoBox: options.showInfoBox !== false, // Default true
            enableRightClick: options.enableRightClick !== false, // Default true
            enableKeyboardNav: options.enableKeyboardNav !== false, // Default true
            ...options
        };
        
        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
    }
    
    start() {
        if (this.isActive) return;
        
        console.log('Starting advanced element picker...');
        this.isActive = true;
        this.scanForShadowRoots();
        this.createUI();
        this.attachEvents();
        document.body.style.cursor = 'crosshair';
    }
    
    stop() {
        if (!this.isActive) return;
        
        console.log('Stopping element picker...');
        this.isActive = false;
        this.removeUI();
        this.detachEvents();
        document.body.style.cursor = '';
        this.currentElement = null;
    }
    
    // Scan for shadow roots in the document
    scanForShadowRoots() {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            if (el.shadowRoot) {
                this.shadowRoots.set(el, el.shadowRoot);
            }
        });
    }
    
    createUI() {
        // Create overlay
        this.overlay = document.createElement('div');
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
        
        // Create highlight box
        this.highlightBox = document.createElement('div');
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
        
        // Create info box only if enabled
        if (this.options.showInfoBox) {
            this.infoBox = document.createElement('div');
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
        if (this.infoBox) document.body.appendChild(this.infoBox);
    }
    
    removeUI() {
        if (this.overlay) this.overlay.remove();
        if (this.highlightBox) this.highlightBox.remove();
        if (this.infoBox) this.infoBox.remove();
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
    }
    
    attachEvents() {
        document.addEventListener('mousemove', this.onMouseMove, true);
        document.addEventListener('click', this.onClick, true);
        if (this.options.enableRightClick) {
            document.addEventListener('contextmenu', this.onContextMenu, true);
        }
        if (this.options.enableKeyboardNav) {
            document.addEventListener('keydown', this.onKeyDown, true);
        }
    }
    
    detachEvents() {
        document.removeEventListener('mousemove', this.onMouseMove, true);
        document.removeEventListener('click', this.onClick, true);
        if (this.options.enableRightClick) {
            document.removeEventListener('contextmenu', this.onContextMenu, true);
        }
        if (this.options.enableKeyboardNav) {
            document.removeEventListener('keydown', this.onKeyDown, true);
        }
    }
    
    onMouseMove(e) {
        if (!this.isActive) return;
        
        // Get element at point (including shadow DOM)
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
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (this.currentElement) {
            this.selectElement(this.currentElement);
        }
    }
    
    onContextMenu(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Right-click to select parent
        if (this.currentElement && this.currentElement.parentElement) {
            this.currentElement = this.currentElement.parentElement;
            this.highlightElement(this.currentElement);
            this.showElementInfo(this.currentElement);
        }
    }
    
    onKeyDown(e) {
        if (e.key === 'Escape') {
            this.stop();
        } else if (this.options.enableKeyboardNav && e.key === 'Enter' && this.currentElement) {
            e.preventDefault();
            this.selectElement(this.currentElement);
        }
    }
    
    // Get element at point including shadow DOM
    getElementAtPoint(x, y) {
        this.overlay.style.display = 'none';
        let element = document.elementFromPoint(x, y);
        
        // Check shadow DOM
        if (element) {
            const shadowRoot = this.shadowRoots.get(element);
            if (shadowRoot) {
                const shadowElement = shadowRoot.elementFromPoint(x, y);
                if (shadowElement) element = shadowElement;
            }
        }
        
        this.overlay.style.display = 'block';
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
        const selector = this.getOptimalSelector(element);
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent?.trim().slice(0, 30) || '';
        
        this.infoBox.innerHTML = `
            <div style="color: #ff6b35; font-weight: bold; margin-bottom: 4px;">Element Info</div>
            <div>Tag: &lt;${tagName}&gt;</div>
            <div>Selector: ${selector}</div>
            ${text ? `<div>Text: "${text}..."</div>` : ''}
            <div style="margin-top: 8px; color: #888;">Click to select | Right-click for parent | ESC to cancel</div>
        `;
        this.infoBox.style.display = 'block';
    }
    
    selectElement(element) {
        console.log('Element selected:', element);
        
        const data = this.extractElementData(element);
        this.stop();
        
        chrome.runtime.sendMessage({
            action: 'elementSelected',
            data: data
        });
    }
    
    extractElementData(element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Generate multiple selector strategies
        const selectors = this.generateSelectors(element);
        
        // Detect event listeners
        const eventListeners = this.detectEventListeners(element);
        
        // Create content fingerprint for resilient tracking
        const contentFingerprint = this.createContentFingerprint(element);
        
        // Get computed accessibility info
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
            text: element.textContent?.trim().slice(0, 200) || null,
            html: element.outerHTML.length > 1000 ? 
                element.outerHTML.slice(0, 1000) + '...' : 
                element.outerHTML,
            
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
            eventListeners: eventListeners,
            hasClickHandler: eventListeners.includes('click'),
            
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
            contentFingerprint: contentFingerprint,
            
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
        
        // Strategy 1: ID selector
        if (element.id && !this.isDynamicId(element.id)) {
            selectors.primary = `#${CSS.escape(element.id)}`;
            selectors.fallbacks.push(selectors.primary);
        }
        
        // Strategy 2: Unique attributes
        const uniqueAttrSelector = this.getUniqueAttributeSelector(element);
        if (uniqueAttrSelector) {
            if (!selectors.primary) selectors.primary = uniqueAttrSelector;
            selectors.fallbacks.push(uniqueAttrSelector);
        }
        
        // Strategy 3: Class combination
        const classSelector = this.getOptimalClassSelector(element);
        if (classSelector) {
            if (!selectors.primary) selectors.primary = classSelector;
            selectors.fallbacks.push(classSelector);
        }
        
        // Strategy 4: Position-based selector
        const positionSelector = this.getPositionSelector(element);
        if (!selectors.primary) selectors.primary = positionSelector;
        selectors.fallbacks.push(positionSelector);
        
        // Strategy 5: Content-based selector
        const contentSelector = this.getContentSelector(element);
        if (contentSelector) {
            selectors.fallbacks.push(contentSelector);
        }
        
        // Remove duplicates
        selectors.fallbacks = [...new Set(selectors.fallbacks)];
        
        return selectors;
    }
    
    // Check if ID is dynamically generated
    isDynamicId(id) {
        // Common patterns for dynamic IDs
        const patterns = [
            /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID
            /^ember\d+$/i, // Ember.js
            /^react-select-\d+-/i, // React
            /^ui-id-\d+$/i, // jQuery UI
            /^\d{10,}$/, // Timestamp
            /^[a-z]+-\d{6,}$/i // Generic pattern
        ];
        
        return patterns.some(pattern => pattern.test(id));
    }
    
    // Get unique attribute selector
    getUniqueAttributeSelector(element) {
        const attrs = [
            'data-testid', 'data-test', 'data-cy', 'data-test-id',
            'data-id', 'data-uid', 'data-key',
            'aria-label', 'aria-labelledby',
            'name', 'for', 'href', 'src', 'action'
        ];
        
        for (const attr of attrs) {
            const value = element.getAttribute(attr);
            if (value) {
                const selector = `${element.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
                if (document.querySelectorAll(selector).length === 1) {
                    return selector;
                }
            }
        }
        
        return null;
    }
    
    // Get optimal class selector
    getOptimalClassSelector(element) {
        if (!element.className || typeof element.className !== 'string') return null;
        
        const classes = element.className.trim().split(/\s+/)
            .filter(c => c && !this.isUtilityClass(c));
        
        if (!classes.length) return null;
        
        // Try different combinations
        for (let i = 1; i <= Math.min(3, classes.length); i++) {
            const combinations = this.getCombinations(classes, i);
            for (const combo of combinations) {
                const selector = combo.map(c => `.${CSS.escape(c)}`).join('');
                if (document.querySelectorAll(selector).length === 1) {
                    return selector;
                }
            }
        }
        
        return null;
    }
    
    // Check if class is a utility class
    isUtilityClass(className) {
        const utilityPatterns = [
            /^(active|hover|focus|disabled|selected|checked)$/i,
            /^is-/i, /^has-/i, /^js-/i,
            /^(xs|sm|md|lg|xl)$/i,
            /^col-/i, /^offset-/i,
            /^text-(left|right|center)$/i
        ];
        
        return utilityPatterns.some(pattern => pattern.test(className));
    }
    
    // Get combinations of array elements
    getCombinations(arr, k) {
        const combinations = [];
        const combine = (start, combo) => {
            if (combo.length === k) {
                combinations.push([...combo]);
                return;
            }
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                combine(i + 1, combo);
                combo.pop();
            }
        };
        combine(0, []);
        return combinations;
    }
    
    // Get position-based selector
    getPositionSelector(element) {
        const path = [];
        let current = element;
        
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id && !this.isDynamicId(current.id)) {
                selector = `#${CSS.escape(current.id)}`;
                path.unshift(selector);
                break;
            }
            
            const parent = current.parentElement;
            if (parent) {
                const sameTagSiblings = Array.from(parent.children)
                    .filter(child => child.tagName === current.tagName);
                
                if (sameTagSiblings.length > 1) {
                    const index = sameTagSiblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }
            
            path.unshift(selector);
            current = parent;
        }
        
        return path.join(' > ');
    }
    
    // Get content-based selector
    getContentSelector(element) {
        const text = element.textContent?.trim();
        if (!text || text.length < 3 || text.length > 50) return null;
        
        const tagName = element.tagName.toLowerCase();
        const escapedText = CSS.escape(text);
        
        // Try :contains pseudo-selector (non-standard but useful)
        return `${tagName}:contains("${escapedText}")`;
    }
    
    // Get CSS path
    getCSSPath(element) {
        const path = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id) {
                selector += `#${current.id}`;
                path.unshift(selector);
                break;
            } else {
                let sibling = current;
                let nth = 1;
                
                while (sibling.previousElementSibling) {
                    sibling = sibling.previousElementSibling;
                    if (sibling.tagName === current.tagName) nth++;
                }
                
                if (nth > 1) selector += `:nth-of-type(${nth})`;
            }
            
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }
    
    // Detect event listeners
    detectEventListeners(element) {
        const listeners = [];
        const eventTypes = [
            'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
            'keydown', 'keyup', 'keypress', 'change', 'input', 'submit', 'focus', 'blur'
        ];
        
        eventTypes.forEach(type => {
            // Check for inline handlers
            if (element[`on${type}`]) {
                listeners.push(type);
            }
            
            // Check for addEventListener (Chrome DevTools Protocol would be better)
            // This is a heuristic approach
            const hasListener = element.getAttribute(`on${type}`) || 
                               (element.tagName.toLowerCase() === 'button' && type === 'click') ||
                               (element.tagName.toLowerCase() === 'a' && type === 'click') ||
                               (element.tagName.toLowerCase() === 'input' && (type === 'change' || type === 'input'));
            
            if (hasListener && !listeners.includes(type)) {
                listeners.push(type);
            }
        });
        
        return listeners;
    }
    
    // Create content fingerprint
    createContentFingerprint(element) {
        const text = element.textContent?.trim().slice(0, 50) || '';
        const attrs = Array.from(element.attributes)
            .filter(a => !['id', 'class', 'style'].includes(a.name))
            .map(a => `${a.name}=${a.value}`)
            .sort()
            .join('|');
        
        return {
            tagName: element.tagName.toLowerCase(),
            textSnippet: text,
            attributeSignature: attrs,
            childrenCount: element.children.length,
            position: element.parentElement ? 
                Array.from(element.parentElement.children).indexOf(element) : -1
        };
    }
    
    // Get accessibility info
    getAccessibilityInfo(element) {
        return {
            role: element.getAttribute('role') || this.getImplicitRole(element),
            ariaLabel: element.getAttribute('aria-label'),
            ariaLabelledBy: element.getAttribute('aria-labelledby'),
            ariaDescribedBy: element.getAttribute('aria-describedby'),
            ariaHidden: element.getAttribute('aria-hidden'),
            tabIndex: element.tabIndex,
            accessibleName: this.getAccessibleName(element)
        };
    }
    
    // Get implicit ARIA role
    getImplicitRole(element) {
        const tagRoles = {
            'a': 'link',
            'button': 'button',
            'input': element.type === 'checkbox' ? 'checkbox' : 'textbox',
            'select': 'combobox',
            'textarea': 'textbox',
            'img': 'img',
            'nav': 'navigation',
            'main': 'main',
            'header': 'banner',
            'footer': 'contentinfo'
        };
        
        return tagRoles[element.tagName.toLowerCase()] || null;
    }
    
    // Get accessible name
    getAccessibleName(element) {
        // Simplified accessible name calculation
        return element.getAttribute('aria-label') ||
               element.getAttribute('title') ||
               element.textContent?.trim().slice(0, 50) ||
               element.getAttribute('alt') ||
               element.getAttribute('placeholder') ||
               '';
    }
    
    // Check if element is in shadow DOM
    isInShadowDOM(element) {
        let current = element;
        while (current) {
            if (current instanceof ShadowRoot) return true;
            current = current.parentNode;
        }
        return false;
    }
    
    // Get frame info
    getFrameInfo(element) {
        if (window.self === window.top) return null;
        
        return {
            isInFrame: true,
            frameDepth: this.getFrameDepth(),
            frameSrc: window.location.href
        };
    }
    
    // Get frame depth
    getFrameDepth() {
        let depth = 0;
        let currentWindow = window;
        
        while (currentWindow !== window.top) {
            depth++;
            currentWindow = currentWindow.parent;
            if (depth > 10) break; // Prevent infinite loop
        }
        
        return depth;
    }
    
    // Get sibling context
    getSiblingContext(element) {
        const parent = element.parentElement;
        if (!parent) return null;
        
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element);
        
        return {
            totalSiblings: siblings.length,
            position: index + 1,
            previousSibling: index > 0 ? {
                tagName: siblings[index - 1].tagName.toLowerCase(),
                id: siblings[index - 1].id || null,
                className: siblings[index - 1].className || null
            } : null,
            nextSibling: index < siblings.length - 1 ? {
                tagName: siblings[index + 1].tagName.toLowerCase(),
                id: siblings[index + 1].id || null,
                className: siblings[index + 1].className || null
            } : null
        };
    }
    
    // Check if element is focusable
    isFocusable(element) {
        const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
        const tagName = element.tagName.toLowerCase();
        
        if (focusableTags.includes(tagName)) {
            return !element.disabled;
        }
        
        return element.tabIndex >= 0;
    }
    
    // Generate advanced manipulation examples
    generateAdvancedManipulationExamples(element, selector) {
        const examples = {};
        const escapedSelector = selector.replace(/'/g, "\\'");
        
        // Basic interactions
        examples.click = `document.querySelector('${escapedSelector}').click();`;
        examples.focus = `document.querySelector('${escapedSelector}').focus();`;
        examples.scrollIntoView = `document.querySelector('${escapedSelector}').scrollIntoView({ behavior: 'smooth', block: 'center' });`;
        
        // Style manipulation
        examples.highlight = `(() => {
    const el = document.querySelector('${escapedSelector}');
    el.style.outline = '3px solid red';
    el.style.backgroundColor = 'yellow';
})();`;
        
        examples.hide = `document.querySelector('${escapedSelector}').style.display = 'none';`;
        examples.show = `document.querySelector('${escapedSelector}').style.display = '';`;
        examples.fadeOut = `(() => {
    const el = document.querySelector('${escapedSelector}');
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.style.display = 'none', 500);
})();`;
        
        // Content manipulation
        if (['input', 'textarea'].includes(element.tagName.toLowerCase())) {
            examples.setValue = `document.querySelector('${escapedSelector}').value = 'New value';`;
            examples.clearValue = `document.querySelector('${escapedSelector}').value = '';`;
            examples.typeText = `(() => {
    const el = document.querySelector('${escapedSelector}');
    el.focus();
    el.value = '';
    const text = 'Hello World';
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            el.value += text[i];
            el.dispatchEvent(new Event('input', { bubbles: true }));
            i++;
        } else {
            clearInterval(typeInterval);
        }
    }, 100);
})();`;
        } else {
            examples.setText = `document.querySelector('${escapedSelector}').textContent = 'New text';`;
            examples.setHTML = `document.querySelector('${escapedSelector}').innerHTML = '<strong>New HTML</strong>';`;
        }
        
        // Event simulation
        examples.simulateClick = `(() => {
    const el = document.querySelector('${escapedSelector}');
    const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1
    });
    el.dispatchEvent(event);
})();`;
        
        examples.simulateHover = `(() => {
    const el = document.querySelector('${escapedSelector}');
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
})();`;
        
        // Advanced interactions
        examples.waitAndClick = `(() => {
    const checkAndClick = setInterval(() => {
        const el = document.querySelector('${escapedSelector}');
        if (el && el.offsetParent !== null) {
            el.click();
            clearInterval(checkAndClick);
            console.log('Element clicked');
        }
    }, 500);
    setTimeout(() => {
        clearInterval(checkAndClick);
        console.log('Timeout: Element not found');
    }, 10000);
})();`;
        
        examples.extractData = `(() => {
    const el = document.querySelector('${escapedSelector}');
    return {
        text: el.textContent,
        value: el.value || null,
        href: el.href || null,
        attributes: Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value]))
    };
})();`;
        
        // Drag and drop helper
        if (element.draggable || element.getAttribute('draggable') === 'true') {
            examples.dragTo = `(() => {
    const source = document.querySelector('${escapedSelector}');
    const target = document.querySelector('TARGET_SELECTOR'); // Replace with target
    
    const dragStart = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
    });
    
    const drop = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dragStart.dataTransfer
    });
    
    source.dispatchEvent(dragStart);
    target.dispatchEvent(drop);
})();`;
        }
        
        return examples;
    }
    
    // Existing helper methods remain the same
    getOptimalSelector(element) {
        return this.generateSelectors(element).primary;
    }
    
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
        
        return `//${path.join('/')}`;
    }
    
    isElementVisible(element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return !!(
            rect.width > 0 &&
            rect.height > 0 &&
            style.opacity !== '0' &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            element.offsetParent !== null
        );
    }
    
    isElementClickable(element) {
        const clickableTags = ['a', 'button', 'input', 'select', 'textarea', 'label'];
        const clickableRoles = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab'];
        const tagName = element.tagName.toLowerCase();
        
        return !!(
            clickableTags.includes(tagName) ||
            element.onclick ||
            element.getAttribute('onclick') ||
            clickableRoles.includes(element.getAttribute('role')) ||
            getComputedStyle(element).cursor === 'pointer' ||
            element.hasAttribute('data-clickable') ||
            element.classList.contains('clickable') ||
            element.classList.contains('btn')
        );
    }
    
    isElementInteractive(element) {
        return !!(
            element.isContentEditable ||
            element.getAttribute('contenteditable') === 'true' ||
            ['input', 'textarea', 'select'].includes(element.tagName.toLowerCase()) ||
            element.tabIndex >= 0 ||
            element.hasAttribute('draggable') ||
            element.hasAttribute('droppable')
        );
    }
    
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
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
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        }
        return dataAttrs;
    }
    
    getFormProperties(element) {
        const tagName = element.tagName.toLowerCase();
        
        if (['input', 'textarea', 'select'].includes(tagName)) {
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
        if (!parent || parent === document.body) return null;
        
        return {
            tagName: parent.tagName.toLowerCase(),
            id: parent.id || null,
            className: parent.className || null,
            selector: this.getOptimalSelector(parent)
        };
    }
}

// Make ElementPicker and ElementManager available globally
window.ElementPicker = ElementPicker;
window.ElementManager = ElementManager;