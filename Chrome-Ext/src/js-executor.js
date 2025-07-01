/**
 * JavaScript Execution Module - Surgically extracted from WebGNE
 * Minimal module that adds JS execution capability to your existing extension
 */

export class JSExecutor {
  constructor(callExternalAPI, callWebLLM, elementManager = null) {
    this.callExternalAPI = callExternalAPI;
    this.callWebLLM = callWebLLM;
    this.elementManager = elementManager;
  }

  /**
   * Set the element manager for accessing stored elements
   */
  setElementManager(elementManager) {
    this.elementManager = elementManager;
  }

  /**
   * Generate JavaScript code using your existing AI functions
   * Now supports element context from the element picker
   */
  async generateCode(prompt, options = {}) {
    const { includeElementContext = true, availableElements = null } = options;
    
    let enhancedPrompt = prompt;
    let elementContext = '';
    
    // Add element context if available and requested
    if (includeElementContext && this.elementManager) {
      // Process element references in the prompt (e.g., @element1, @loginButton)
      enhancedPrompt = this.elementManager.processElementReferences(prompt);
      
      // If no specific elements referenced, add context about available elements
      if (!prompt.includes('@') && availableElements !== null) {
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

## Core Requirements:
- Write only executable code, no explanations or comments
- Don't use try-catch blocks (they're added automatically)
- Code runs in an async function context, so you can use await

## Element Context:
${elementContext ? `You have access to these stored page elements:
${elementContext}

To interact with these elements, use standard DOM methods:
- document.querySelector('#elementId') or document.querySelector('.className')
- element.click(), element.value, element.textContent, etc.
- When possible, use the specific selectors provided above` : 'No stored elements are currently available'}

## Approach:
- For navigation: Use window.location or window.open()
- For DOM manipulation: Use document.querySelector, etc.
- For HTTP requests: Use fetch()
- When interacting with stored elements, use their specific selectors for reliability
- Only suggest complex automation (Puppeteer) if specifically requested

NEVER use Node.js APIs like require(), exec(), fs, child_process, etc.`
      },
      { role: "user", content: enhancedPrompt }
    ];

    // Try external API first, fallback to WebLLM (same as your existing pattern)
    let response;
    try {
      response = await this.callExternalAPI(messages);
    } catch (error) {
      response = await this.callWebLLM(messages);
    }

    // Extract code from markdown if present (same as WebGNE)
    let code = response;
    const match = code.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
    if (match) code = match[1];
    
    return code.trim();
  }

  /**
   * Format available elements for the AI context
   */
  _formatAvailableElements(elements) {
    if (!elements || elements.length === 0) return '';
    
    return elements.map(({ id, displayName, data, name }) => {
      const selector = data.id ? `#${data.id}` : 
                      data.className ? `.${data.className.split(' ')[0]}` : 
                      data.tagName;
      
      const text = data.text ? ` (text: "${data.text.slice(0, 50)}${data.text.length > 50 ? '...' : ''}")` : '';
      
      return `- @${displayName}: ${selector}${text}`;
    }).join('\n');
  }

  /**
   * Execute JavaScript code via background script (where Chrome APIs are available)
   */
  async runCode(code) {
    try {
      // Send code to background script for execution
      const response = await chrome.runtime.sendMessage({
        action: 'executeJS',
        code: code
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

  /**
   * Generate and execute in one call
   * Now supports element context
   */
  async execute(prompt, options = {}) {
    const code = await this.generateCode(prompt, options);
    const result = await this.runCode(code);
    return { code, result };
  }

  /**
   * Generate code specifically for interacting with a selected element
   */
  async generateElementInteraction(elementId, action, additionalContext = '') {
    if (!this.elementManager) {
      throw new Error('Element manager not available');
    }
    
    const elementData = this.elementManager.getElementData(elementId);
    if (!elementData) {
      throw new Error(`Element @${elementId} not found`);
    }
    
    const prompt = `${action} the element @${elementId}. ${additionalContext}`.trim();
    return this.generateCode(prompt, { includeElementContext: true });
  }

  /**
   * Get suggestions for what can be done with currently stored elements
   */
  getElementSuggestions() {
    if (!this.elementManager) return [];
    
    const elements = this.elementManager.getAllElements();
    const suggestions = [];
    
    elements.forEach(({ displayName, data }) => {
      const name = `@${displayName}`;
      
      // Basic interactions based on element type
      if (data.tagName === 'button' || data.tagName === 'input' && data.type === 'submit') {
        suggestions.push(`Click ${name}`);
      } else if (data.tagName === 'input') {
        if (data.type === 'text' || data.type === 'email' || data.type === 'password') {
          suggestions.push(`Fill ${name} with text`);
        } else if (data.type === 'checkbox' || data.type === 'radio') {
          suggestions.push(`Check/uncheck ${name}`);
        }
      } else if (data.tagName === 'select') {
        suggestions.push(`Select option from ${name}`);
      } else if (data.tagName === 'textarea') {
        suggestions.push(`Fill ${name} with text`);
      } else if (data.tagName === 'a') {
        suggestions.push(`Click link ${name}`);
      } else {
        suggestions.push(`Interact with ${name}`);
      }
      
      // General suggestions
      suggestions.push(`Get text from ${name}`);
      suggestions.push(`Scroll to ${name}`);
    });
    
    return suggestions;
  }

  /**
   * Generate code for common element operations
   */
  async generateCommonAction(action, elementId, value = null) {
    if (!this.elementManager) {
      throw new Error('Element manager not available');
    }

    const elementData = this.elementManager.getElementData(elementId);
    if (!elementData) {
      throw new Error(`Element @${elementId} not found`);
    }

    const selector = elementData.id ? `#${elementData.id}` : 
                    elementData.className ? `.${elementData.className.split(' ')[0]}` : 
                    elementData.tagName;

    let code = '';
    
    switch (action.toLowerCase()) {
      case 'click':
        code = `document.querySelector('${selector}').click();`;
        break;
        
      case 'fill':
      case 'type':
        if (!value) throw new Error('Value is required for fill/type action');
        code = `
const element = document.querySelector('${selector}');
element.focus();
element.value = '${value.replace(/'/g, "\\'")}';
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));`;
        break;
        
      case 'clear':
        code = `
const element = document.querySelector('${selector}');
element.focus();
element.value = '';
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));`;
        break;
        
      case 'gettext':
        code = `
const element = document.querySelector('${selector}');
return element.textContent || element.value || '';`;
        break;
        
      case 'scroll':
        code = `
const element = document.querySelector('${selector}');
element.scrollIntoView({ behavior: 'smooth', block: 'center' });`;
        break;
        
      case 'highlight':
        code = `
const element = document.querySelector('${selector}');
element.style.outline = '3px solid red';
setTimeout(() => element.style.outline = '', 2000);`;
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return code.trim();
  }

  /**
   * Execute a common action on an element
   */
  async executeCommonAction(action, elementId, value = null) {
    const code = await this.generateCommonAction(action, elementId, value);
    return this.runCode(code);
  }
}