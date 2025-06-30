// Ultra-lightweight panel script
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
let apiEndpoint = "";
let apiKey = "";

// Load settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    apiEndpoint: "http://localhost:1234/v1/chat/completions",
    apiKey: ""
  });
  
  apiEndpoint = settings.apiEndpoint;
  apiKey = settings.apiKey;
  
  if (apiEndpoint) {
    statusEl.textContent = "Ready";
    enableInput();
  } else {
    statusEl.textContent = "Configure API in settings";
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

// Call API
async function callAPI(messages) {
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

// Handle message sending
async function handleSend() {
  const query = inputEl.value.trim();
  if (!query || !apiEndpoint) return;
  
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
    
    const response = await callAPI(apiMessages);
    
    messages.push({ role: "user", content: query });
    messages.push({ role: "assistant", content: response });
    
    addMessage(response, "assistant");
    statusEl.textContent = "Ready";
    
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