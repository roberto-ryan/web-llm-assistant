/**
 * JavaScript Execution Module - Surgically extracted from WebGNE
 * Minimal module that adds JS execution capability to your existing extension
 */

export class JSExecutor {
  constructor(callExternalAPI, callWebLLM) {
    this.callExternalAPI = callExternalAPI;
    this.callWebLLM = callWebLLM;
  }

  /**
   * Generate JavaScript code using your existing AI functions
   */
  async generateCode(prompt) {
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

## Approach:
- For navigation: Use window.location or window.open()
- For DOM manipulation: Use document.querySelector, etc.
- For HTTP requests: Use fetch()
- Only suggest complex automation (Puppeteer) if specifically requested

NEVER use Node.js APIs like require(), exec(), fs, child_process, etc.`
      },
      { role: "user", content: prompt }
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
   */
  async execute(prompt) {
    const code = await this.generateCode(prompt);
    const result = await this.runCode(code);
    return { code, result };
  }
}