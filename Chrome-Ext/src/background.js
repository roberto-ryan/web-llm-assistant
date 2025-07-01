// Background script with WebLLM support
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

// JavaScript Execution using only Chrome Scripting API
async function executeJavaScript(code) {
  try {
    // Get the active tab for script execution
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab) {
      return { success: false, error: 'No active tab found' };
    }

    // Execute code using chrome.scripting.executeScript in MAIN world
    const result = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (userCode) => {
        try {
          // Create script element and inject the user code
          const script = document.createElement('script');
          const resultVar = '__extensionResult_' + Date.now();
          
          script.textContent = `
            window['${resultVar}'] = (async () => {
              try {
                ${userCode}
              } catch (e) {
                return { success: false, error: e.toString() };
              }
            })();
          `;
          
          document.head.appendChild(script);
          document.head.removeChild(script);
          
          // Wait for the async result
          let attempts = 0;
          const checkResult = () => {
            if (window[resultVar] !== undefined) {
              const result = window[resultVar];
              delete window[resultVar];
              return result || { success: true, message: 'Executed successfully' };
            }
            if (attempts < 100) {
              attempts++;
              setTimeout(checkResult, 10);
              return null;
            }
            return { success: false, error: 'Execution timeout' };
          };
          
          return checkResult();
          
        } catch (e) {
          return { success: false, error: e.toString() };
        }
      },
      args: [code],
      world: 'MAIN'
    });
    
    return result[0]?.result || { success: true, message: 'Executed' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeJS') {
    executeJavaScript(request.code)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Will respond asynchronously
  }
});