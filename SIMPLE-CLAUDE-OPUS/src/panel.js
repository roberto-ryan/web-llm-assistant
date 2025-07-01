// Panel script with external API primary, WebLLM fallback
import showdown from "showdown";
import { ServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { MenuManager } from "./menu-template.js";

const messagesDiv = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const newChatBtn = document.getElementById("new-chat-btn");
const statusEl = document.getElementById("status");

// Initialize menu manager
const menuManager = new MenuManager(inputEl);

const markdownConverter = new showdown.Converter({
  simplifiedAutoLink: true,
  openLinksInNewWindow: true
});

let messages = [];
let useExternalAPI = true;
let apiEndpoint = "";
let apiKey = "";
let webllmEngine = null;
let webllmModel = "";

// Load settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    useExternalAPI: true,
    apiEndpoint: "http://localhost:1234/v1/chat/completions",
    apiKey: "",
    webllmModel: "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  });
  
  useExternalAPI = settings.useExternalAPI;
  apiEndpoint = settings.apiEndpoint;
  apiKey = settings.apiKey;
  webllmModel = settings.webllmModel;
  
  if (useExternalAPI && apiEndpoint) {
    statusEl.textContent = "Connected to external API";
    enableInput();
    // Preload WebLLM in background for fallback
    setTimeout(() => initWebLLM(webllmModel, true), 5000);
  } else {
    statusEl.textContent = "Loading WebLLM...";
    await initWebLLM(webllmModel, false);
  }
  
  // Initialize menu after settings are loaded
  menuManager.init();
}

// Initialize WebLLM
async function initWebLLM(model, isBackground = false) {
  try {
    if (!isBackground) {
      statusEl.textContent = "Initializing WebLLM...";
    }
    
    webllmEngine = new ServiceWorkerMLCEngine({
      initProgressCallback: (progress) => {
        if (!isBackground) {
          statusEl.textContent = `Loading model: ${Math.round(progress.progress * 100)}%`;
        }
      }
    });
    
    // Connect to background script
    const port = chrome.runtime.connect({ name: "webllm" });
    
    await webllmEngine.reload(model, {
      context_window_size: 4096,
      temperature: 0.7
    });
    
    if (!isBackground) {
      statusEl.textContent = "WebLLM ready";
      enableInput();
    }
  } catch (error) {
    console.error("WebLLM initialization failed:", error);
    if (!isBackground) {
      statusEl.textContent = "WebLLM failed - using external API";
      if (apiEndpoint) {
        enableInput();
      }
    }
  }
}

// Enable input
function enableInput() {
  sendBtn.disabled = false;
  inputEl.focus();
}

// Add message to UI
function addMessage(content, role) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}`;
  messageEl.innerHTML = role === "assistant" 
    ? markdownConverter.makeHtml(content) 
    : content;
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Get page context
async function getPageContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "get_page_context" });
      if (response && response.status === "success") {
        return response.data;
      }
    }
  } catch (error) {
    console.warn("Could not get page context (content script may not be loaded):", error.message);
  }
  return null;
}

// Call external API
async function callExternalAPI(messages) {
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { "Authorization": `Bearer ${apiKey}` })
    },
    body: JSON.stringify({
      messages: messages,
      stream: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Call WebLLM
async function callWebLLM(messages) {
  if (!webllmEngine) {
    throw new Error("WebLLM not initialized");
  }
  
  const completion = await webllmEngine.chat.completions.create({
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
  });
  
  return completion.choices[0].message.content;
}

// Handle new chat
function handleNewChat() {
  // Clear messages array
  messages = [];
  
  // Clear messages from UI
  messagesDiv.innerHTML = "";
  
  // Focus input
  inputEl.focus();
  
  // Optional: Show a welcome message
  addMessage("Chat cleared. How can I help you?", "system");
}

// Handle message sending
async function handleSend() {
  const query = inputEl.value.trim();
  if (!query) return;
  
  inputEl.value = "";
  sendBtn.disabled = true;
  
  addMessage(query, "user");
  
  // Get page context if available
  const context = await getPageContext();
  
  // Build system message
  const systemMessage = {
    role: "system",
    content: `You are a helpful AI assistant running in the user's browser. 
${context ? `Current page: ${context.title} (${context.url})
${context.selection ? `Selected text: "${context.selection}"` : `Page preview: ${context.visibleText}`}` : ''}
Provide helpful, concise responses.`
  };
  
  // Prepare messages (keep last 10 for context)
  const recentMessages = messages.slice(-10);
  const apiMessages = [systemMessage, ...recentMessages, { role: "user", content: query }];
  
  try {
    statusEl.textContent = "Thinking...";
    
    let response;
    let usedFallback = false;
    
    if (useExternalAPI && apiEndpoint) {
      try {
        response = await callExternalAPI(apiMessages);
      } catch (error) {
        console.error("External API failed:", error);
        
        // Try WebLLM fallback
        if (!webllmEngine) {
          statusEl.textContent = "Loading WebLLM fallback...";
          await initWebLLM(webllmModel, false);
        }
        
        response = await callWebLLM(apiMessages);
        usedFallback = true;
      }
    } else {
      // Use WebLLM directly
      response = await callWebLLM(apiMessages);
    }
    
    messages.push({ role: "user", content: query });
    messages.push({ role: "assistant", content: response });
    
    addMessage(response, "assistant");
    statusEl.textContent = usedFallback ? "WebLLM (fallback)" : (useExternalAPI ? "External API" : "WebLLM");
    
  } catch (error) {
    console.error("Error:", error);
    addMessage(`Error: ${error.message}`, "error");
    statusEl.textContent = "Error occurred";
  }
  
  sendBtn.disabled = false;
  inputEl.focus();
}

// Event listeners
sendBtn.addEventListener("click", handleSend);
newChatBtn.addEventListener("click", handleNewChat);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Initialize
loadSettings();