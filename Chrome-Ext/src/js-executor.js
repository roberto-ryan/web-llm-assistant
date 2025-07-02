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
   * Now supports element context from the element picker and page context
   */
  async generateCode(prompt, options = {}) {
    const { includeElementContext = true, availableElements = null, pageContext = null, validateCode = false } = options;
    
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

${pageContextInfo}

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
- Use the page context above to understand the current page and make contextually relevant code
- NEVER use Import Scripts or external libraries!

NEVER use Node.js APIs like require(), exec(), fs, child_process, etc.

IF YOU DEFINE A FUNCTION, MAKE SURE TO ACTUALLY CALL IT AT THE END OF YOUR CODE!`
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
    
    code = code.trim();
    
    // Optional validation step to ensure code is executable
    if (validateCode) {
      code = await this.validateAndFixCode(code, prompt);
    }
    
    return code;
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
   * Now supports element context and page context
   * Includes validation by default to ensure executable code
   */
  async execute(prompt, options = {}) {
    // Enable validation by default for execution
    const executeOptions = { validateCode: true, ...options };
    const code = await this.generateCode(prompt, executeOptions);
    const result = await this.runCode(code);
    return { code, result };
  }

  /**
   * Generate code specifically for interacting with a selected element
   */
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

  /**
   * Validate generated code and fix execution issues
   * Checks if the code is ready to execute and fixes common issues like uncalled functions
   */
  async validateAndFixCode(code, originalPrompt) {
    const validationMessages = [
      {
        role: "system",
        content: `You are a JavaScript code validator. Analyze the provided code and determine if it's ready to execute in the browser console.

## Your Task:
1. Check if the code will actually execute when run (not just define functions)
2. If functions are defined but not called, add the minimal code to call them
3. If the code is already executable, return it unchanged
4. Only make minimal changes needed for execution

## Rules:
- Output ONLY the executable JavaScript code, no explanations
- Don't add try-catch blocks
- Don't add comments or explanations
- If a function is defined but not called, call it at the end
- If the code is already executable, don't change it
- Keep all original functionality intact`
      },
      {
        role: "user",
        content: `Original request: "${originalPrompt}"

Generated code to validate:
\`\`\`javascript
${code}
\`\`\`

Is this code ready to execute? If not, fix it with minimal changes to make it executable.`
      }
    ];

    let response;
    try {
      response = await this.callExternalAPI(validationMessages);
    } catch (error) {
      response = await this.callWebLLM(validationMessages);
    }

    // Extract code from markdown if present
    let validatedCode = response;
    const match = validatedCode.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
    if (match) validatedCode = match[1];
    
    return validatedCode.trim();
  }

  /**
   * Generate validated JavaScript code that's guaranteed to be executable
   * Convenience method that always includes validation
   */
  async generateExecutableCode(prompt, options = {}) {
    return this.generateCode(prompt, { ...options, validateCode: true });
  }
}