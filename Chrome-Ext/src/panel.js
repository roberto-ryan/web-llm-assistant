// Panel script with external API primary, WebLLM fallback
import showdown from "showdown";
import { ServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { MenuManager } from "./menu-template.js";

const messagesDiv = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const newChatBtn = document.getElementById("new-chat-btn");
const elementPickerBtn = document.getElementById("element-picker-btn");
const statusEl = document.getElementById("status");

// Initialize menu manager
const menuManager = new MenuManager(inputEl);

// Element Picker Controller
class ElementPickerController {
    constructor() {
        this.elementStore = new Map(); // Store elements by ID
        this.elementCounter = 1;
        this.storageKey = 'web_llm_elements';
        this.setupEventListeners();
        this.loadStoredElements();
    }
    
    // Load elements from Chrome storage
    async loadStoredElements() {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            if (result[this.storageKey]) {
                const stored = result[this.storageKey];
                this.elementStore = new Map(stored.elements || []);
                this.elementCounter = stored.counter || 1;
                console.log(`Loaded ${this.elementStore.size} stored elements`);
                
                // Show loaded elements in chat
                if (this.elementStore.size > 0) {
                    const elementList = Array.from(this.elementStore.entries())
                        .map(([id, data]) => {
                            const name = data.id ? `#${data.id}` : 
                                        data.className ? `.${data.className.split(' ')[0]}` : 
                                        `<${data.tagName}>`;
                            return `@${id} (${name})`;
                        }).join(', ');
                    
                    addMessage(`📌 Restored ${this.elementStore.size} saved elements: ${elementList}`, "system");
                }
            }
        } catch (error) {
            console.error('Error loading stored elements:', error);
        }
    }
    
    // Save elements to Chrome storage
    async saveElements() {
        try {
            const dataToStore = {
                elements: Array.from(this.elementStore.entries()),
                counter: this.elementCounter,
                timestamp: Date.now()
            };
            
            await chrome.storage.local.set({
                [this.storageKey]: dataToStore
            });
            
            console.log('Elements saved to storage');
        } catch (error) {
            console.error('Error saving elements:', error);
        }
    }
    
    // Clear all stored elements
    async clearStoredElements() {
        try {
            this.elementStore.clear();
            this.elementCounter = 1;
            await chrome.storage.local.remove([this.storageKey]);
            addMessage("🗑️ All stored elements cleared", "system");
            console.log('All stored elements cleared');
        } catch (error) {
            console.error('Error clearing elements:', error);
        }
    }
    
    setupEventListeners() {
        elementPickerBtn?.addEventListener('click', () => this.togglePicker());
        
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.action === 'elementSelected') {
                this.insertElement(msg.data);
                this.setPickerActive(false);
            }
        });
    }
    
    togglePicker() {
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
    
    insertElement(data) {
        // Generate unique element ID
        const elementId = `element${this.elementCounter}`;
        this.elementCounter++;
        
        // Store the element data
        this.elementStore.set(elementId, data);
        
        // Save to persistent storage
        this.saveElements();
        
        // Show a clean summary message in the chat
        const elementSummary = this.formatElementSummary(data, elementId);
        addMessage(elementSummary, "system");
        
        // Add element reference to input if it's empty, otherwise just show the notification
        if (!inputEl.value.trim()) {
            inputEl.value = `Analyze @${elementId}`;
            inputEl.focus();
        }
    }
    
    formatElementSummary(data, elementId) {
        const elementName = data.id ? `#${data.id}` : 
                           data.className ? `.${data.className.split(' ')[0]}` : 
                           `<${data.tagName}>`;
        
        const text = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? '...' : ''}"` : '';
        
        return `🎯 **@${elementId}** saved: ${elementName}${text}`;
    }
    
    // Get element data by reference (e.g., "element1")
    getElementData(elementRef) {
        return this.elementStore.get(elementRef);
    }
    
    // Get all stored elements
    getAllElements() {
        return Array.from(this.elementStore.entries()).map(([id, data]) => ({
            id,
            data,
            name: data.id ? `#${data.id}` : 
                  data.className ? `.${data.className.split(' ')[0]}` : 
                  `<${data.tagName}>`
        }));
    }
    
    // Process message to replace element references with actual data
    processElementReferences(message) {
        const elementPattern = /@(element\d+)/g;
        let processedMessage = message;
        let foundElements = [];
        
        message.replace(elementPattern, (match, elementId) => {
            const elementData = this.getElementData(elementId);
            if (elementData) {
                foundElements.push({ id: elementId, data: elementData });
            }
            return match;
        });
        
        // If we found element references, append their detailed info
        if (foundElements.length > 0) {
            processedMessage += '\n\n--- Referenced Elements ---\n';
            foundElements.forEach(({ id, data }) => {
                processedMessage += `\n@${id}:\n${this.formatElementInfo(data)}\n`;
            });
        }
        
        return processedMessage;
    }
    
    formatElementInfo(data) {
        // Helper function to escape HTML
        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        
        const styles = Object.entries(data.styles || {})
            .filter(([key, value]) => value && value !== 'none' && value !== 'auto' && value !== '')
            .map(([key, value]) => `  ${key}: ${value}`)
            .join('\n');
            
        return `Element: ${data.selector}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ''}
${data.className ? `Classes: ${data.className}` : ''}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ''}

HTML:
\`\`\`html
${data.html}
\`\`\`

${data.text ? `Text Content: "${data.text}"` : ''}

Key Styles:
\`\`\`css
${styles}
\`\`\``;
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
        const name = data.id ? `#${data.id}` : 
                    data.className ? `.${data.className.split(' ')[0]}` : 
                    `<${data.tagName}>`;
        return `@${id}`;
      }).slice(0, 5).join(', '); // Show first 5
    
    welcomeMessage += `\n\n📌 Available elements: ${elementList}${storedElementsCount > 5 ? ` (+${storedElementsCount - 5} more)` : ''}`;
  }
  
  addMessage(welcomeMessage, "system");
}

// Handle message sending
async function handleSend() {
  const query = inputEl.value.trim();
  if (!query) return;
  
  inputEl.value = "";
  sendBtn.disabled = true;
  
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
When users reference @element1, @element2, etc., these refer to specific web elements they've selected. The detailed element information will be included in their message.
Provide helpful, concise responses.`
  };
  
  // Prepare messages (keep last 10 for context)
  const recentMessages = messages.slice(-10);
  const apiMessages = [systemMessage, ...recentMessages, { role: "user", content: processedQuery }];
  
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
    
    messages.push({ role: "user", content: processedQuery });
    messages.push({ role: "assistant", content: response });
    
    // Update global reference for export functionality
    window.messages = messages;
    
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

// Add simple autocomplete for element references
inputEl.addEventListener("input", (e) => {
  const value = e.target.value;
  const cursorPos = e.target.selectionStart;
  
  // Check if user is typing @element
  const beforeCursor = value.substring(0, cursorPos);
  const atMatch = beforeCursor.match(/@element(\d*)$/);
  
  if (atMatch) {
    // Show available elements in console for now (could be enhanced with a dropdown)
    const availableElements = elementPickerController.getAllElements();
    if (availableElements.length > 0) {
      console.log("Available elements:", availableElements.map(el => `@${el.id} (${el.name})`));
    }
  }
});

// Initialize
loadSettings();