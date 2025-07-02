// Panel script with external API primary, WebLLM fallback
import showdown from "showdown";
import { ServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { MenuManager } from "./menu-template.js";
import { JSExecutor } from "./js-executor.js";

const messagesDiv = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const newChatBtn = document.getElementById("new-chat-btn");
const elementPickerBtn = document.getElementById("element-picker-btn");
const statusEl = document.getElementById("status");

// Initialize menu manager
const menuManager = new MenuManager(inputEl);

// Import element management - we'll create a dynamic import to avoid module issues
let ElementManager;

// Element Picker Controller - now just handles UI and delegates to ElementManager
class ElementPickerController {
    constructor() {
        this.elementManager = null;
        this.initElementManager();
        this.setupEventListeners();
    }
    
    async initElementManager() {
        // Dynamic import to avoid circular dependencies
        if (typeof window !== 'undefined' && window.ElementManager) {
            this.elementManager = new window.ElementManager();
        } else {
            // Fallback: load from script
            const script = document.createElement('script');
            script.src = './elementPicker.js';
            script.onload = () => {
                this.elementManager = new window.ElementManager();
                this.showLoadedElements();
                this.connectToJSExecutor();
            };
            document.head.appendChild(script);
            return;
        }
        this.showLoadedElements();
        this.connectToJSExecutor();
    }
    
    // Connect element manager to JS executor
    connectToJSExecutor() {
        if (jsExecutor && this.elementManager) {
            jsExecutor.setElementManager(this.elementManager);
            console.log('Element manager connected to JS executor');
        }
    }
    
    // Show loaded elements in chat on startup
    async showLoadedElements() {
        if (!this.elementManager) return;
        
        // Wait a bit for elements to load
        setTimeout(() => {
            const storedElementsCount = this.elementManager.elementStore.size;
            if (storedElementsCount > 0) {
                const elementList = Array.from(this.elementManager.elementStore.entries())
                    .map(([id, data]) => {
                        const name = data.id ? `#${data.id}` : 
                                    data.className ? `.${data.className.split(' ')[0]}` : 
                                    `<${data.tagName}>`;
                        return `@${id} (${name})`;
                    }).join(', ');
                
                addMessage(`📌 Restored ${storedElementsCount} saved elements: ${elementList}`, "system");
            }
        }, 100);
    }
    
    setupEventListeners() {
        elementPickerBtn?.addEventListener('click', () => this.togglePicker());
        
        let lastElementData = null;
        let lastElementTime = 0;
        
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.action === 'elementSelected') {
                console.log('Panel received elementSelected message:', msg);
                
                // Prevent duplicate element processing within 1 second
                const now = Date.now();
                const isDuplicate = lastElementData && 
                    JSON.stringify(lastElementData) === JSON.stringify(msg.data) &&
                    (now - lastElementTime) < 1000;
                
                if (!isDuplicate) {
                    console.log('Processing new element (not a duplicate)');
                    lastElementData = msg.data;
                    lastElementTime = now;
                    this.insertElement(msg.data);
                    this.setPickerActive(false);
                } else {
                    console.log('Skipping duplicate element selection');
                }
            }
        });
    }
    
    async togglePicker() {
        const isActive = elementPickerBtn.classList.contains('active');
        
        if (isActive) {
            this.stopPicker();
            this.setPickerActive(false);
        } else {
            this.startPicker();
            this.setPickerActive(true);
        }
    }
    
    startPicker() {
        chrome.tabs.query({active: true, currentWindow: true}, 
            tabs => chrome.tabs.sendMessage(tabs[0].id, {action: 'startPicker'}, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error starting picker:', chrome.runtime.lastError);
                } else if (response && response.status === 'error') {
                    console.error('Picker error:', response.message);
                }
            })
        );
    }
    
    stopPicker() {
        chrome.tabs.query({active: true, currentWindow: true}, 
            tabs => chrome.tabs.sendMessage(tabs[0].id, {action: 'stopPicker'}, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error stopping picker:', chrome.runtime.lastError);
                } else if (response && response.status === 'error') {
                    console.error('Picker error:', response.message);
                }
            })
        );
    }
    
    setPickerActive(active) {
        elementPickerBtn?.classList.toggle('active', active);
    }
    
    async insertElement(data) {
        if (!this.elementManager) return;
        
        const result = await this.elementManager.addElement(data);
        
        // Show a clean summary message in the chat with rename option
        const elementSummary = this.elementManager.formatElementSummary(result.data, result.id);
        addMessage(elementSummary, "system");
        
        // Always add element reference to input
        const currentValue = inputEl.value;
        const elementRef = `@${result.id}`;
        
        // If input is empty, add "Analyze @elementN", otherwise append " @elementN" to existing text
        if (!currentValue.trim()) {
            inputEl.value = `rename ${elementRef} `;
        } else {
            // Add a space before the element reference if the input doesn't end with whitespace
            const separator = currentValue.endsWith(' ') ? '' : ' ';
            inputEl.value = currentValue + separator + elementRef;
        }
        
        // Focus and place cursor at the end
        inputEl.focus();
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    }
    
    // Delegate methods to ElementManager
    async renameElement(currentName, newName) {
        if (!this.elementManager) return false;
        
        try {
            await this.elementManager.renameElement(currentName, newName);
            addMessage(`✅ Renamed "@${currentName}" to "@${newName}"`, "system");
            return true;
        } catch (error) {
            addMessage(`❌ ${error.message}`, "error");
            return false;
        }
    }
    
    async clearStoredElements() {
        if (!this.elementManager) return;
        
        const success = await this.elementManager.clearStoredElements();
        if (success) {
            addMessage("🗑️ All stored elements cleared", "system");
        }
    }
    
    async deleteElement(elementId) {
        if (!this.elementManager) return false;
        
        try {
            const success = await this.elementManager.deleteElement(elementId);
            if (success) {
                addMessage(`🗑️ Deleted element "@${elementId}"`, "system");
                return true;
            } else {
                addMessage(`❌ Failed to delete element "@${elementId}"`, "error");
                return false;
            }
        } catch (error) {
            addMessage(`❌ Error deleting element: ${error.message}`, "error");
            return false;
        }
    }
    
    getElementData(elementRef) {
        return this.elementManager?.getElementData(elementRef);
    }
    
    getAllElements() {
        return this.elementManager?.getAllElements() || [];
    }
    
    processElementReferences(message) {
        return this.elementManager?.processElementReferences(message) || message;
    }
    
    // Expose elementStore for compatibility
    get elementStore() {
        return this.elementManager?.elementStore || new Map();
    }
}

// Initialize element picker controller
const elementPickerController = new ElementPickerController();

// Make it globally accessible for menu
window.elementPickerController = elementPickerController;

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

// Add JS executor
let jsExecutor = null;

// Make messages accessible globally for export functionality
window.messages = messages;

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
  
  // Initialize JS executor with your existing AI functions
  jsExecutor = new JSExecutor(callExternalAPI, callWebLLM);
  
  // Connect element manager to JS executor when available
  if (elementPickerController && elementPickerController.elementManager) {
    jsExecutor.setElementManager(elementPickerController.elementManager);
  }
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
  
  if (role === "assistant") {
    messageEl.innerHTML = markdownConverter.makeHtml(content);
  } else if (role === "user") {
    // For user messages, preserve newlines by converting them to <br> tags
    // and escape HTML to prevent XSS
    const escapedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
    messageEl.innerHTML = escapedContent;
  } else {
    messageEl.innerHTML = content;
  }
  
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return messageEl;
}

// Create a streaming message element that can be updated
function createStreamingMessage(role) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}`;
  messageEl.innerHTML = ""; // Start empty
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return messageEl;
}

// Update streaming message content
function updateStreamingMessage(messageEl, content, role) {
  if (role === "assistant") {
    messageEl.innerHTML = markdownConverter.makeHtml(content);
  } else {
    messageEl.innerHTML = content;
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Get page context
async function getPageContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "get_page_context" });
      if (response && response.status === "success") {
        console.log("Panel - Received page context:", {
          hasSelection: !!response.data.selection,
          selectionLength: response.data.selection?.length || 0,
          hasVisibleText: !!response.data.visibleText,
          selection: response.data.selection?.substring(0, 100) + (response.data.selection?.length > 100 ? "..." : "")
        });
        return response.data;
      }
    }
  } catch (error) {
    console.warn("Could not get page context (content script may not be loaded):", error.message);
  }
  return null;
}

// Call external API with streaming support
async function callExternalAPI(messages, onChunk = null) {
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { "Authorization": `Bearer ${apiKey}` })
    },
    body: JSON.stringify({
      messages: messages,
      stream: !!onChunk // Enable streaming only if onChunk callback is provided
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  if (onChunk && response.body) {
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content, fullContent);
              }
            } catch (e) {
              // Skip malformed JSON chunks
              console.warn('Skipping malformed chunk:', dataStr);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return fullContent;
  } else {
    // Handle non-streaming response
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Call WebLLM with streaming support
async function callWebLLM(messages, onChunk = null) {
  if (!webllmEngine) {
    throw new Error("WebLLM not initialized");
  }
  
  if (onChunk) {
    // Handle streaming response
    let fullContent = "";
    
    const completion = await webllmEngine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true
    });
    
    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullContent += content;
        onChunk(content, fullContent);
      }
    }
    
    return fullContent;
  } else {
    // Handle non-streaming response
    const completion = await webllmEngine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return completion.choices[0].message.content;
  }
}

// Handle new chat
function handleNewChat() {
  // Clear messages array
  messages = [];
  
  // Update global reference for export functionality
  window.messages = messages;
  
  // Clear messages from UI
  messagesDiv.innerHTML = "";
  
  // Focus input
  inputEl.focus();
  
  // Show welcome message with element info
  const storedElementsCount = elementPickerController.elementStore.size;
  let welcomeMessage = "Chat cleared. How can I help you?";
  
  if (storedElementsCount > 0) {
    const elementList = Array.from(elementPickerController.elementStore.entries())
      .map(([id, data]) => {
        return `@${data.customName || id}`;
      }).slice(0, 5).join(', '); // Show first 5
    
    welcomeMessage += `\n\n📌 Available elements: ${elementList}${storedElementsCount > 5 ? ` (+${storedElementsCount - 5} more)` : ''}`;
  }
  
  addMessage(welcomeMessage, "system");
}

// Handle message sending
async function handleSend() {
  const query = inputEl.value.trim();
  if (!query) return;
  
  // Check if user wants to execute JavaScript
  if (query.startsWith('/x ')) {
    const jsPrompt = query.replace('/x ', '');
    addMessage(query, "user");
    
    try {
      addMessage("Generating code...", "system");
      
      // Get page context for better code generation
      const pageContext = await getPageContext();
      
      const { code, result } = await jsExecutor.execute(jsPrompt, { pageContext });
      
      if (result.success) {
        addMessage(`✅ ${result.message || 'Code executed successfully'}\n\nCode:\n\`\`\`javascript\n${code}\n\`\`\``, "assistant");
      } else {
        addMessage(`❌ ${result.error}\n\nCode:\n\`\`\`javascript\n${code}\n\`\`\``, "error");
      }
    } catch (error) {
      addMessage(`Error: ${error.message}`, "error");
    }
    
    inputEl.value = "";
    return; // Don't process as regular chat
  }
  
  inputEl.value = "";
  sendBtn.disabled = true;
  
  // Check for rename command: "rename @oldname newname"
  const renameMatch = query.match(/^rename\s+@([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
  if (renameMatch) {
    const [, oldName, newName] = renameMatch;
    await elementPickerController.renameElement(oldName, newName);
    sendBtn.disabled = false;
    inputEl.focus();
    return;
  }
  
  // Process element references in the query
  const processedQuery = elementPickerController.processElementReferences(query);
  
  addMessage(query, "user");
  
  // Get page context if available
  const context = await getPageContext();
  
  // Build system message
  const systemMessage = {
    role: "system",
    content: `You are a helpful AI assistant running in the user's browser. 
${context ? `Current page: ${context.title} (${context.url})
${context.selection ? `Selected text: "${context.selection}"` : `Page preview: ${context.visibleText}`}` : ''}
When users reference @elementN or custom names like @login, @button, etc., these refer to specific web elements they've selected. The detailed element information will be included in their message.
Users can rename elements using "rename @oldname newname" command.
Provide helpful, concise responses.`
  };
  
  // Prepare messages (keep last 10 for context)
  const recentMessages = messages.slice(-10);
  const apiMessages = [systemMessage, ...recentMessages, { role: "user", content: processedQuery }];
  
  try {
    statusEl.textContent = "Thinking...";
    
    let response = "";
    let usedFallback = false;
    
    // Create streaming message element
    const streamingMessageEl = createStreamingMessage("assistant");
    
    // Define streaming callback
    const onChunk = (chunk, fullContent) => {
      updateStreamingMessage(streamingMessageEl, fullContent, "assistant");
    };
    
    if (useExternalAPI && apiEndpoint) {
      try {
        response = await callExternalAPI(apiMessages, onChunk);
      } catch (error) {
        console.error("External API failed:", error);
        
        // Remove the failed streaming message and show error briefly
        streamingMessageEl.remove();
        const errorMsg = addMessage("External API failed, falling back to WebLLM...", "system");
        
        // Try WebLLM fallback
        if (!webllmEngine) {
          statusEl.textContent = "Loading WebLLM fallback...";
          await initWebLLM(webllmModel, false);
        }
        
        // Create new streaming message for fallback
        const fallbackStreamingEl = createStreamingMessage("assistant");
        const fallbackOnChunk = (chunk, fullContent) => {
          updateStreamingMessage(fallbackStreamingEl, fullContent, "assistant");
        };
        
        response = await callWebLLM(apiMessages, fallbackOnChunk);
        usedFallback = true;
        
        // Remove the error message after a delay
        setTimeout(() => errorMsg.remove(), 2000);
      }
    } else {
      // Use WebLLM directly
      response = await callWebLLM(apiMessages, onChunk);
    }
    
    messages.push({ role: "user", content: processedQuery });
    messages.push({ role: "assistant", content: response });
    
    // Update global reference for export functionality
    window.messages = messages;
    
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

// Expose functions globally for autocomplete commands
window.addMessage = addMessage;
window.handleNewChat = handleNewChat;
window.messages = messages;
window.messagesDiv = messagesDiv;
window.elementPickerController = elementPickerController;