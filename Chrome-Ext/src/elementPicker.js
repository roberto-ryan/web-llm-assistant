// Simplified Element Management for Interactable Elements Only
class InteractableElementManager {
    constructor() {
        this.elementStore = new Map();
        this.elementCounter = 1;
        this.storageKey = 'web_llm_interactive_elements';
        this.loadStoredElements();
    }
    
    async loadStoredElements() {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            if (result[this.storageKey]) {
                const stored = result[this.storageKey];
                this.elementStore = new Map(stored.elements || []);
                this.elementCounter = stored.counter || 1;
                console.log(`Loaded ${this.elementStore.size} interactive elements`);
            }
        } catch (error) {
            console.error('Error loading stored elements:', error);
        }
    }
    
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
        } catch (error) {
            console.error('Error saving elements:', error);
        }
    }
    
    async addElement(data) {
        const elementId = `element${this.elementCounter}`;
        this.elementCounter++;
        
        const elementData = {
            ...data,
            defaultId: elementId,
            capturedAt: Date.now()
        };
        
        this.elementStore.set(elementId, elementData);
        await this.saveElements();
        
        return { id: elementId, data: elementData };
    }
    
    getElementData(elementRef) {
        return this.elementStore.get(elementRef);
    }
    
    getAllElements() {
        return Array.from(this.elementStore.entries()).map(([id, data]) => ({
            id,
            data,
            name: data.name || data.text?.slice(0, 30) || `${data.tagName}`
        }));
    }
    
    async clearStoredElements() {
        this.elementStore.clear();
        this.elementCounter = 1;
        await chrome.storage.local.remove([this.storageKey]);
        return true;
    }
}

// Simplified Element Picker for Interactive Elements Only
class InteractableElementPicker {
    constructor(elementManager) {
        this.isActive = false;
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
        this.elementManager = elementManager;
        this.currentElement = null;
        
        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    
    // Define interactable element types
    isInteractable(element) {
        const tag = element.tagName.toLowerCase();
        const interactableTags = ['button', 'input', 'select', 'textarea', 'a'];
        
        return interactableTags.includes(tag) || 
               element.onclick ||
               element.getAttribute('role') === 'button' ||
               element.classList.contains('btn') ||
               element.classList.contains('clickable') ||
               element.hasAttribute('data-action');
    }
    
    // Check if an ID is dynamic/unreliable
    isDynamicId(id) {
        const dynamicPatterns = [
            /\d{8,}/, // Long numbers (timestamps)
            /[a-f0-9]{8,}/, // Hex strings (UUIDs)
            /^(ember|react|vue|angular)\d+/, // Framework IDs
            /^auto_|temp|tmp|generated/i,
            /_\d+$/
        ];
        return dynamicPatterns.some(pattern => pattern.test(id));
    }
    
    // Check if class is a utility class to avoid
    isUtilityClass(className) {
        const utilityPatterns = [
            /^(m|p)[trblxy]?-\d+$/, // margin/padding
            /^(w|h)-\d+$/, // width/height
            /^text-(xs|sm|base|lg|xl)$/, // text sizes
            /^(bg|text|border)-(primary|secondary|success|danger)$/, // colors
            /^(flex|grid|block|inline)/, // display
            /^d-/, // Bootstrap display
            /^col-/ // Bootstrap grid
        ];
        return utilityPatterns.some(pattern => pattern.test(className));
    }
    
    start() {
        if (this.isActive) return;
        
        console.log('Starting interactive element picker...');
        this.isActive = true;
        this.createUI();
        this.attachEvents();
        document.body.style.cursor = 'crosshair';
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.removeUI();
        this.detachEvents();
        document.body.style.cursor = '';
        this.currentElement = null;
    }
    
    createUI() {
        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            background: rgba(0, 0, 0, 0.01) !important;
            z-index: 999999 !important;
            cursor: crosshair !important;
        `;
        
        // Highlight box
        this.highlightBox = document.createElement('div');
        this.highlightBox.style.cssText = `
            position: absolute !important;
            border: 2px solid #ff6b35 !important;
            background: rgba(255, 107, 53, 0.1) !important;
            z-index: 1000000 !important;
            pointer-events: none !important;
            display: none !important;
        `;
        
        // Info box
        this.infoBox = document.createElement('div');
        this.infoBox.style.cssText = `
            position: fixed !important;
            bottom: 20px !important; right: 20px !important;
            background: rgba(0, 0, 0, 0.9) !important;
            color: white !important;
            padding: 12px !important;
            border-radius: 8px !important;
            font-size: 12px !important;
            font-family: monospace !important;
            z-index: 1000001 !important;
            display: none !important;
            max-width: 300px !important;
        `;
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlightBox);
        document.body.appendChild(this.infoBox);
    }
    
    removeUI() {
        if (this.overlay) this.overlay.remove();
        if (this.highlightBox) this.highlightBox.remove();
        if (this.infoBox) this.infoBox.remove();
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
        
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // Only highlight if interactable
        if (element && this.isInteractable(element) && 
            element !== this.highlightBox && element !== this.infoBox) {
            this.currentElement = element;
            this.highlightElement(element);
            this.showElementInfo(element);
        }
    }
    
    onClick(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (this.currentElement && this.isInteractable(this.currentElement)) {
            this.selectElement(this.currentElement);
        }
    }
    
    onKeyDown(e) {
        if (e.key === 'Escape') {
            this.stop();
        }
    }
    
    highlightElement(element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;
        
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
        `;
    }
    
    showElementInfo(element) {
        const selector = this.generateSimpleSelector(element);
        const interactionType = this.getInteractionType(element);
        const text = element.textContent?.trim().slice(0, 30) || '';
        
        this.infoBox.innerHTML = `
            <div style="color: #ff6b35; font-weight: bold;">Interactive Element</div>
            <div>Type: ${interactionType}</div>
            <div>Tag: &lt;${element.tagName.toLowerCase()}&gt;</div>
            <div>Selector: ${selector}</div>
            ${text ? `<div>Text: "${text}..."</div>` : ''}
            <div style="margin-top: 8px; color: #888;">Click to select | ESC to cancel</div>
        `;
        this.infoBox.style.display = 'block';
    }
    
    selectElement(element) {
        const data = this.extractMinimalData(element);
        this.stop();
        
        chrome.runtime.sendMessage({
            action: 'elementSelected',
            data: data
        });
    }
    
    // Generate simple, reliable selectors
    generateSimpleSelector(element) {
        // 1. ID (if not dynamic)
        if (element.id && !this.isDynamicId(element.id)) {
            return `#${CSS.escape(element.id)}`;
        }
        
        // 2. Name attribute (forms)
        if (element.name) {
            return `[name="${CSS.escape(element.name)}"]`;
        }
        
        // 3. Type + value (buttons)
        if (element.type && element.value && element.value.length < 30) {
            const selector = `${element.tagName.toLowerCase()}[type="${element.type}"][value="${CSS.escape(element.value)}"]`;
            if (document.querySelectorAll(selector).length === 1) {
                return selector;
            }
        }
        
        // 4. Simple unique class
        if (element.className) {
            const classes = element.className.trim().split(/\s+/)
                .filter(c => c && !this.isUtilityClass(c));
            
            for (const cls of classes) {
                const selector = `.${CSS.escape(cls)}`;
                if (document.querySelectorAll(selector).length === 1) {
                    return selector;
                }
            }
        }
        
        // 5. Simple position
        return this.getSimplePosition(element);
    }
    
    getSimplePosition(element) {
        const tag = element.tagName.toLowerCase();
        
        // If unique tag
        if (document.querySelectorAll(tag).length === 1) {
            return tag;
        }
        
        // Parent context
        const parent = element.parentElement;
        if (parent && parent.id && !this.isDynamicId(parent.id)) {
            const selector = `#${CSS.escape(parent.id)} ${tag}`;
            if (document.querySelectorAll(selector).length === 1) {
                return selector;
            }
        }
        
        // Fallback
        return tag;
    }
    
    // Extract minimal data for interactable elements
    extractMinimalData(element) {
        const tag = element.tagName.toLowerCase();
        
        return {
            // Essential identification
            selector: this.generateSimpleSelector(element),
            tagName: tag,
            text: element.textContent?.trim().slice(0, 100) || null,
            
            // Interaction type
            interactionType: this.getInteractionType(element),
            
            // Form-specific data
            formProperties: this.getFormData(element),
            
            // Basic validation
            isVisible: this.isVisible(element),
            isEnabled: !element.disabled,
            
            // Basic attributes for context
            id: element.id || null,
            name: element.name || null,
            type: element.type || null,
            value: element.value || null,
            className: element.className || null,
            
            // Simple manipulation examples
            examples: this.generateSimpleExamples(element)
        };
    }
    
    getInteractionType(element) {
        const tag = element.tagName.toLowerCase();
        
        if (tag === 'a') return 'navigate';
        if (tag === 'button' || element.type === 'submit' || element.type === 'button') return 'click';
        if (tag === 'input') {
            if (['text', 'email', 'password', 'search', 'url'].includes(element.type)) return 'input';
            if (['checkbox', 'radio'].includes(element.type)) return 'toggle';
            return 'click';
        }
        if (['textarea', 'select'].includes(tag)) return 'input';
        
        return 'click';
    }
    
    getFormData(element) {
        const tag = element.tagName.toLowerCase();
        
        if (!['input', 'textarea', 'select', 'button'].includes(tag)) return null;
        
        return {
            type: element.type || null,
            name: element.name || null,
            value: element.value || null,
            placeholder: element.placeholder || null,
            required: element.required || false,
            disabled: element.disabled || false
        };
    }
    
    isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        
        return !!(
            rect.width > 0 &&
            rect.height > 0 &&
            style.opacity !== '0' &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
        );
    }
    
    generateSimpleExamples(element) {
        const selector = this.generateSimpleSelector(element);
        const examples = {};
        const interactionType = this.getInteractionType(element);
        
        // Basic click
        examples['Click'] = `document.querySelector('${selector}').click()`;
        
        // Type-specific examples
        if (interactionType === 'input') {
            examples['Set Value'] = `document.querySelector('${selector}').value = 'new value'`;
            examples['Clear'] = `document.querySelector('${selector}').value = ''`;
        }
        
        if (interactionType === 'toggle') {
            examples['Check'] = `document.querySelector('${selector}').checked = true`;
            examples['Uncheck'] = `document.querySelector('${selector}').checked = false`;
        }
        
        if (element.tagName.toLowerCase() === 'select') {
            examples['Select Option'] = `document.querySelector('${selector}').value = 'option-value'`;
        }
        
        return examples;
    }
}

// Make classes available globally
window.InteractableElementPicker = InteractableElementPicker;
window.InteractableElementManager = InteractableElementManager;

// Usage example:
// const manager = new InteractableElementManager();
// const picker = new InteractableElementPicker(manager);
// picker.start();