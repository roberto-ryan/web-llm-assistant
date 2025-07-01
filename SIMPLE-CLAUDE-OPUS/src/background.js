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