// Element Management Service
class ElementManager {
    constructor() {
        this.elementStore = new Map(); // Store elements by ID
        this.elementCounter = 1;
        this.storageKey = 'web_llm_elements';
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
            this.elementStore.clear();
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
            // Check if element exists
            if (!this.elementStore.has(elementId)) {
                console.warn(`Element "${elementId}" not found`);
                return false;
            }
            
            // Remove from store
            this.elementStore.delete(elementId);
            
            // Save to persistent storage
            await this.saveElements();
            
            console.log(`Element "${elementId}" deleted successfully`);
            return true;
        } catch (error) {
            console.error('Error deleting element:', error);
            return false;
        }
    }
    
    // Add a new element
    async addElement(data) {
        const elementId = `element${this.elementCounter}`;
        this.elementCounter++;
        
        const elementData = {
            ...data,
            customName: null,
            defaultId: elementId
        };
        
        this.elementStore.set(elementId, elementData);
        await this.saveElements();
        
        return { id: elementId, data: elementData };
    }
    
    // Rename an element
    async renameElement(currentName, newName) {
        // Validate new name (alphanumeric, no spaces, no special chars except underscore)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
            throw new Error("Invalid name. Use only letters, numbers, and underscores. Must start with a letter.");
        }
        
        // Check if new name is already in use
        const existingElement = this.findElementByName(newName);
        if (existingElement && existingElement !== currentName) {
            throw new Error(`Name "@${newName}" is already in use.`);
        }
        
        // Find the element
        const elementData = this.elementStore.get(currentName);
        if (!elementData) {
            throw new Error(`Element "@${currentName}" not found.`);
        }
        
        // If renaming to a custom name
        if (newName !== elementData.defaultId) {
            // Remove old entry and add with new name
            this.elementStore.delete(currentName);
            elementData.customName = newName;
            this.elementStore.set(newName, elementData);
        } else {
            // Reverting to default name
            elementData.customName = null;
            if (currentName !== elementData.defaultId) {
                this.elementStore.delete(currentName);
                this.elementStore.set(elementData.defaultId, elementData);
            }
        }
        
        // Save to persistent storage
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
    
    // Get current name of an element (custom or default)
    getCurrentName(elementKey) {
        const data = this.elementStore.get(elementKey);
        return data?.customName || elementKey;
    }
    
    // Get element data by reference (e.g., "element1")
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
    
    // Process message to replace element references with actual data
    processElementReferences(message) {
        // Support both @elementN and custom names like @login
        const elementPattern = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let processedMessage = message;
        let foundElements = [];
        
        message.replace(elementPattern, (match, elementRef) => {
            // Try to find element by name (could be custom name or default ID)
            let elementData = this.getElementData(elementRef);
            
            // If not found by direct key, search by custom name
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
        
        // If we found element references, append their detailed info
        if (foundElements.length > 0) {
            processedMessage += '\n\n--- Referenced Elements ---\n';
            foundElements.forEach(({ id, data }) => {
                processedMessage += `\n@${id}:\n${this.formatElementInfo(data)}\n`;
            });
        }
        
        return processedMessage;
    }
    
    formatElementInfo(data) {
        // Helper function to escape HTML
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
            
        return `Element: ${data.selector}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ''}
${data.className ? `Classes: ${data.className}` : ''}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ''}

HTML:
\`\`\`html
${data.html}
\`\`\`

${data.text ? `Text Content: "${data.text}"` : ''}

Key Styles:
\`\`\`css
${styles}
\`\`\``;
    }
    
    formatElementSummary(data, elementId) {
        const elementName = data.id ? `#${data.id}` : 
                           data.className ? `.${data.className.split(' ')[0]}` : 
                           `<${data.tagName}>`;
        
        const text = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? '...' : ''}"` : '';
        const displayName = data.customName || elementId;
        
        return `🎯 **@${displayName}** saved: ${elementName}${text} (Type "rename @${displayName} newname" to rename)`;
    }
}

// Simple and reliable Element Picker
class ElementPicker {
    constructor(elementManager) {
        this.isActive = false;
        this.overlay = null;
        this.highlightBox = null;
        this.elementManager = elementManager;
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    
    start() {
        if (this.isActive) return;
        
        console.log('Starting element picker...');
        this.isActive = true;
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
    }
    
    createUI() {
        // Create semi-transparent overlay
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
        `;
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlightBox);
        
        console.log('UI created');
    }
    
    removeUI() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.highlightBox) {
            this.highlightBox.remove();
            this.highlightBox = null;
        }
    }
    
    attachEvents() {
        document.addEventListener('mousemove', this.onMouseMove, true);
        document.addEventListener('click', this.onClick, true);
        document.addEventListener('keydown', this.onKeyDown, true);
    }
    
    detachEvents() {
        document.removeEventListener('mousemove', this.onMouseMove, true);
        document.removeEventListener('click', this.onClick, true);
        document.removeEventListener('keydown', this.onKeyDown, true);
    }
    
    onMouseMove(e) {
        if (!this.isActive) return;
        
        // Get element under cursor (excluding our overlay)
        this.overlay.style.display = 'none';
        const element = document.elementFromPoint(e.clientX, e.clientY);
        this.overlay.style.display = 'block';
        
        if (element && element !== this.highlightBox) {
            this.highlightElement(element);
        }
    }
    
    onClick(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Get element under cursor (excluding our overlay)
        this.overlay.style.display = 'none';
        const element = document.elementFromPoint(e.clientX, e.clientY);
        this.overlay.style.display = 'block';
        
        if (element && element !== this.highlightBox) {
            this.selectElement(element);
        }
    }
    
    onKeyDown(e) {
        if (e.key === 'Escape') {
            this.stop();
        }
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
    
    selectElement(element) {
        console.log('Element selected:', element);
        
        const data = this.extractElementData(element);
        this.stop();
        
        // Send to extension with element data
        chrome.runtime.sendMessage({
            action: 'elementSelected',
            data: data
        });
    }
    
    extractElementData(element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            selector: this.getSelector(element),
            text: element.textContent?.trim().slice(0, 200) || null,
            html: element.outerHTML.length > 500 ? 
                element.outerHTML.slice(0, 500) + '...' : 
                element.outerHTML,
            position: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            },
            styles: {
                display: style.display,
                position: style.position,
                width: style.width,
                height: style.height,
                backgroundColor: style.backgroundColor,
                color: style.color,
                fontSize: style.fontSize,
                fontFamily: style.fontFamily
            }
        };
    }
    
    getSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) {
            const firstClass = element.className.split(' ')[0];
            if (firstClass) return `.${firstClass}`;
        }
        return element.tagName.toLowerCase();
    }
}

// Make ElementPicker and ElementManager available globally for content script
window.ElementPicker = ElementPicker;
window.ElementManager = ElementManager;
