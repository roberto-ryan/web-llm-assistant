// Simplified background script - handles WebLLM fallback only
import { ExtensionServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let webllmHandler;

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "webllm") {
    if (!webllmHandler) {
      webllmHandler = new ExtensionServiceWorkerMLCEngineHandler(port);
    } else {
      webllmHandler.setPort(port);
    }
    port.onMessage.addListener(webllmHandler.onmessage.bind(webllmHandler));
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });