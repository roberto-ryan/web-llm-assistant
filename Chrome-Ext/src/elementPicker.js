// Simple and reliable Element Picker
class ElementPicker {
    constructor() {
        this.isActive = false;
        this.overlay = null;
        this.highlightBox = null;
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
        
        // Send to extension
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

// Make ElementPicker available globally for content script
window.ElementPicker = ElementPicker;
