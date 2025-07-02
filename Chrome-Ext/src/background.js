// Background script with Content Script Injection and DevTools API methods
// 
// CSP-SAFE IMPLEMENTATION NOTES:
// This implementation avoids eval() in the background script to prevent CSP EvalErrors.
// The executeViaMainWorld function uses the Function constructor within the page context
// instead of eval() in the background context. However, very strict CSP sites (like Office 365,
// Teams, GitHub) also block the Function constructor. The extension automatically detects
// CSP violations and falls back to DevTools execution, which bypasses CSP entirely.
//
import { ServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let webllmHandler = null;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle WebLLM connection
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "webllm") {
    if (!webllmHandler) {
      webllmHandler = new ServiceWorkerMLCEngineHandler(port);
    } else {
      webllmHandler.setPort(port);
    }
    port.onMessage.addListener(webllmHandler.onmessage.bind(webllmHandler));
  }
});

// Method 1: Direct execution in MAIN world (CSP-safe approach)
async function executeViaMainWorld(code) {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab) {
      return { success: false, error: 'No active tab found' };
    }

    // Create a dynamic function that takes the user code as a parameter
    // This avoids eval() in the background script entirely
    const executionFunc = function(userCode) {
      return (async () => {
        try {
          // Try to detect if Function constructor is allowed by CSP
          // Some strict CSP sites block both eval() and Function constructor
          try {
            // Test if Function constructor is available
            const testFunc = new Function('return true');
            if (!testFunc()) throw new Error('Function constructor test failed');
          } catch (funcError) {
            // Function constructor is blocked by CSP
            throw new Error('CSP blocks Function constructor');
          }
          
          // Create a new Function in the page context (not background context)
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const dynamicFunc = new AsyncFunction(userCode);
          return await dynamicFunc();
        } catch (error) {
          return { success: false, error: error.toString(), cspBlocked: error.message.includes('CSP') };
        }
      })();
    };

    // Execute in MAIN world, passing the code as an argument
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: executionFunc,
      args: [code],
      world: 'MAIN'
    });
    
    if (results && results[0]) {
      const result = results[0].result;
      // Check if the result indicates an error
      if (result && typeof result === 'object' && result.success === false) {
        // If CSP blocked the Function constructor, throw CSP_VIOLATION
        if (result.cspBlocked) {
          throw new Error('CSP_VIOLATION');
        }
        return result;
      }
      return { success: true, result: result };
    }
    
    return { success: true };
    
  } catch (error) {
    // This will fail on strict CSP sites that also restrict Function constructor
    if (error.message?.includes('EvalError') || error.message?.includes('CSP') || 
        error.message?.includes('Function constructor') || error.message === 'CSP_VIOLATION') {
      throw new Error('CSP_VIOLATION');
    }
    console.error('Main world execution error:', error);
    return { success: false, error: error.toString() };
  }
}

// Method 2: Chrome DevTools API (Option 3 - most reliable, no CSP restrictions)
async function executeViaDevTools(code) {
  let tabId = null;
  
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab) {
      return { success: false, error: 'No active tab found' };
    }
    
    tabId = activeTab.id;

    // Attach debugger to the tab
    await chrome.debugger.attach({ tabId }, '1.3');
    
    try {
      // Enable runtime
      await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');
      
      // Wrap code in async IIFE if not already
      let wrappedCode = code.trim();
      if (!wrappedCode.startsWith('(async')) {
        wrappedCode = `(async () => {
          ${wrappedCode}
        })()`;
      }
      
      // Execute the JavaScript code
      const result = await chrome.debugger.sendCommand(
        { tabId },
        'Runtime.evaluate',
        {
          expression: wrappedCode,
          awaitPromise: true,
          returnByValue: true,
          userGesture: true
        }
      );
      
      // Detach debugger
      await chrome.debugger.detach({ tabId });
      
      if (result.exceptionDetails) {
        return { 
          success: false, 
          error: result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Execution error' 
        };
      }
      
      return { success: true, result: result.result?.value };
      
    } catch (error) {
      // Make sure to detach debugger on error
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        // Ignore detach errors
      }
      throw error;
    }
    
  } catch (error) {
    // Clean up debugger if still attached
    if (tabId) {
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        // Ignore detach errors
      }
    }
    
    console.error('DevTools execution error:', error);
    return { success: false, error: error.toString() };
  }
}

// Main execution function that tries different methods
async function executeJavaScript(code, options = {}) {
  const { preferDevTools = false, forceMethod = null } = options;
  
  console.log(`Executing JavaScript with options:`, { preferDevTools, forceMethod });
  console.log('Code to execute:', code);
  
  // If a specific method is forced, use only that
  if (forceMethod === 'devTools') {
    return await executeViaDevTools(code);
  } else if (forceMethod === 'mainWorld') {
    try {
      return await executeViaMainWorld(code);
    } catch (error) {
      if (error.message === 'CSP_VIOLATION') {
        return { 
          success: false, 
          error: 'CSP restriction: Cannot execute dynamic code on this page. Use DevTools mode instead.',
          cspBlocked: true 
        };
      }
      return { success: false, error: error.toString() };
    }
  }
  
  // Auto mode: try main world first, then DevTools
  try {
    console.log('Attempting MAIN world execution...');
    const result = await executeViaMainWorld(code);
    console.log('MAIN world execution successful:', result);
    return result;
  } catch (error) {
    console.log('MAIN world execution failed, checking for CSP violation...');
    if (error.message === 'CSP_VIOLATION' || 
        error.message?.includes('Function constructor') ||
        error.message?.includes('EvalError') ||
        preferDevTools) {
      // Fallback to DevTools
      console.log('Using DevTools fallback due to CSP or preference...');
      const devToolsResult = await executeViaDevTools(code);
      // Add a note that fallback was used
      if (devToolsResult.success) {
        devToolsResult.usedFallback = true;
        devToolsResult.fallbackReason = 'Content Security Policy prevented MAIN world execution';
      }
      return devToolsResult;
    }
    console.error('Non-CSP execution error:', error);
    return { 
      success: false, 
      error: error.toString(),
      details: error.stack 
    };
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeJS') {
    executeJavaScript(request.code, request.options || {})
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
  } else if (request.action === 'executeViaMainWorld') {
    executeViaMainWorld(request.code)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
  } else if (request.action === 'executeViaDevTools') {
    executeViaDevTools(request.code)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
  } else if (request.action === 'elementSelected') {
    chrome.runtime.sendMessage(request);
    sendResponse({ success: true });
  }
});