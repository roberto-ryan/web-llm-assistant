import { tool } from "@mlc-ai/web-agent-interface";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("received message", message);
  if (message.action === "function_call") {
    const { function_name, parameters } = message;
    console.log("Message received from side panel:", function_name, parameters);
    try {
      const response = tool[function_name].implementation(parameters);
      console.log("handler response", response);
      sendResponse({ status: "success", observation: response});
    } catch (error) {
      console.error("Error in handler response", error);
      sendResponse({ status: "error", observation: error.message || error.toString() });
    }
  }
});
