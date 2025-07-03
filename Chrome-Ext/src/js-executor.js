/**
 * JavaScript Execution Module with dual execution methods
 * Supports both Content Script Injection and DevTools API
 */

export class JSExecutor {
  constructor(callExternalAPI, callWebLLM, elementManager = null) {
    this.callExternalAPI = callExternalAPI;
    this.callWebLLM = callWebLLM;
    this.elementManager = elementManager;
    this.executionMethod = 'auto'; // 'auto', 'contentScript', 'devTools'
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
    let elementContext = '';
    let pageContextInfo = '';
    
    // Add page context if available
    if (pageContext) {
      pageContextInfo = `
## Current Page Context:
- URL: ${pageContext.url}
- Title: ${pageContext.title}${pageContext.selection ? `
- Selected text: "${pageContext.selection}"` : pageContext.visibleText ? `
- Page preview: ${pageContext.visibleText}` : ''}
`;
    }
    
    // Add element context if available and requested
    if (includeElementContext && this.elementManager) {
      enhancedPrompt = this.elementManager.processElementReferences(prompt);
      
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
- element.click(), element.value, element.textContent, etc.` : 'No stored elements are currently available'}

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

    // Try external API first, fallback to WebLLM
    let response;
    try {
      response = await this.callExternalAPI(messages);
    } catch (error) {
      response = await this.callWebLLM(messages);
    }

    // Extract code from markdown if present
    let code = response;
    const match = code.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
    if (match) code = match[1];
    
    // Fix common AI mistakes - remove function wrapper
    code = code.replace(/^async\s+function\s*\(\s*\)\s*\{([\s\S]*)\}$/m, '$1');
    code = code.replace(/^function\s*\(\s*\)\s*\{([\s\S]*)\}$/m, '$1');
    
    return code.trim();
  }

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

  async runCode(code, options = {}) {
    try {
      // Check if we're on a strict CSP site and auto-prefer DevTools
      const isStrictCSP = await this._detectStrictCSP();
      
      const executionOptions = {
        preferDevTools: this.executionMethod === 'devTools' || isStrictCSP,
        forceMethod: this.executionMethod === 'auto' ? null : this.executionMethod,
        ...options
      };
      
      // Log CSP detection for debugging
      if (isStrictCSP) {
        console.log('Strict CSP site detected, preferring DevTools execution');
      }
      
      // Determine which action to use based on execution method
      let action = 'executeJS'; // Default auto mode
      if (this.executionMethod === 'mainWorld') {
        action = 'executeViaMainWorld';
      } else if (this.executionMethod === 'devTools') {
        action = 'executeViaDevTools';
      }
      
      const response = await chrome.runtime.sendMessage({
        action: action,
        code: code,
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

  async generateElementInteraction(elementId, action, additionalContext = '', pageContext = null) {
    if (!this.elementManager) {
      throw new Error('Element manager not available');
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
    let lastError;
    let methods = ['auto', 'mainWorld', 'devTools'];
    
    for (let method of methods) {
      this.setExecutionMethod(method);
      
      try {
        const result = await this.execute(prompt, options);
        
        if (result.result && result.result.success !== false) {
          return result;
        }
        
        lastError = result.result?.error || 'Unknown error';
      } catch (error) {
        lastError = error.toString();
      }
    }
    
    return { 
      code: '', 
      result: { 
        success: false, 
        error: `Failed with all execution methods. Last error: ${lastError}` 
      } 
    };
  }

  // Get current execution method info
  async getExecutionInfo() {
    const methods = {
      'auto': 'Automatic selection (tries main world first, then DevTools on CSP failure)',
      'mainWorld': 'Direct execution in MAIN world (may fail on strict CSP)',
      'devTools': 'Chrome DevTools API (most reliable, shows debugger banner)'
    };
    
    const isStrictCSP = await this._detectStrictCSP();
    
    return {
      current: this.executionMethod,
      description: methods[this.executionMethod],
      available: Object.keys(methods),
      strictCSPDetected: isStrictCSP,
      recommendedMethod: isStrictCSP ? 'devTools' : 'auto'
    };
  }

  // Helper method to detect if current page likely has strict CSP
  async _detectStrictCSP() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.url) return false;
      
      const url = new URL(activeTab.url);
      const hostname = url.hostname.toLowerCase();
      
      // Known domains with strict CSP that block Function constructor
      const strictCSPDomains = [
        'office365.com',
        'teams.microsoft.com',
        'outlook.com',
        'onedrive.com',
        'sharepoint.com',
        'office.com',
        'live.com',
        'bing.com',
        'delve.office.com',
        'github.com' // GitHub also has strict CSP
      ];
      
      return strictCSPDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch (error) {
      return false;
    }
  }

  // Automatically prefer DevTools on strict CSP sites
  async _autoSelectExecutionMethod() {
    if (this.executionMethod !== 'auto') return;
    
    const hasStrictCSP = await this._detectStrictCSP();
    if (hasStrictCSP) {
      this.setExecutionMethod('devTools');
    }
  }
}