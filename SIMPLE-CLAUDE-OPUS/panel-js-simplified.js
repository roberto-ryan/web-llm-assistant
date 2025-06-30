import { ExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import showdown from "showdown";

const messagesDiv = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");

const markdownConverter = new showdown.Converter({
  simplifiedAutoLink: true,
  openLinksInNewWindow: true
});

let messages = [];
let useExternalAPI = false;
let apiEndpoint = "";
let apiKey = "";
let webllmEngine = null;

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
  
  if (useExternalAPI && apiEndpoint) {
    statusEl.textContent = "Connected to external API";
    enableInput();
  } else {
    statusEl.textContent = "Loading WebLLM fallback...";
    await loadWebLLM(settings.webllmModel);
  }
}

// Load WebLLM as fallback
async function loadWebLLM(model) {
  try {
    webllmEngine = new ExtensionServiceWorkerMLCEngine();
    
    // Connect to the service worker
    const port = chrome.runtime.connect({ name: "webllm" });
    
    await webllmEngine.reload(model, {
      context_window_size: 4096,
      temperature: 0.7
    });
    statusEl.textContent = "WebLLM ready";
    enableInput();
  } catch (error) {
    statusEl.textContent = "Failed to load AI model";
    console.error("WebLLM load error:", error);
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
      if (response.status === "success") {
        return response.data;
      }
    }
  } catch (error) {
    console.error("Failed to get page context:", error);
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
  const completion = await webllmEngine.chat.completions.create({
    messages: messages,
    temperature: 0.7,
    stream: false
  });
  return completion.choices[0].message.content;
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
    if (useExternalAPI && apiEndpoint) {
      try {
        response = await callExternalAPI(apiMessages);
      } catch (error) {
        console.error("External API failed, falling back to WebLLM:", error);
        if (!webllmEngine) {
          statusEl.textContent = "Loading WebLLM fallback...";
          await loadWebLLM("Llama-3.2-1B-Instruct-q4f16_1-MLC");
        }
        response = await callWebLLM(apiMessages);
      }
    } else {
      response = await callWebLLM(apiMessages);
    }
    
    messages.push({ role: "user", content: query });
    messages.push({ role: "assistant", content: response });
    
    addMessage(response, "assistant");
    statusEl.textContent = useExternalAPI ? "External API" : "WebLLM";
    
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
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Initialize
loadSettings();