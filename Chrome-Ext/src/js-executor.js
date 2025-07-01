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
        content: `Generate JavaScript code for web automation. Rules:
- Write only executable code, no explanations
- Don't use try-catch blocks (they're added automatically)
- Always end with: return {success: true, message: "what happened"}`
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
   * Execute JavaScript code on active tab (exact WebGNE implementation)
   */
  async runCode(code) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      // Primary method: Execute in MAIN world to bypass CSP (same as WebGNE)
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: (userCode) => {
          try {
            return Function(`"use strict"; ${userCode}`)();
          } catch (e) {
            return { success: false, error: e.toString() };
          }
        },
        args: [code]
      });
      
      return result || { success: true, message: 'Executed' };
    } catch (e) {
      // Fallback method: Inject as script tag (same as WebGNE)
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (userCode) => {
          const script = document.createElement('script');
          const id = 'webgne_' + Date.now();
          script.textContent = `
            window['${id}'] = (() => {
              try { ${userCode} }
              catch(e) { return {success: false, error: e.toString()} }
            })();
          `;
          document.head.appendChild(script);
          script.remove();
          const res = window[id];
          delete window[id];
          return res || { success: true };
        },
        args: [code]
      });
      
      return result;
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