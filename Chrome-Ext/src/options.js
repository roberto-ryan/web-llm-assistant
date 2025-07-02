// Options page script
const useExternalAPIEl = document.getElementById("useExternalAPI");
const apiSettingsEl = document.getElementById("apiSettings");
const apiEndpointEl = document.getElementById("apiEndpoint");
const apiKeyEl = document.getElementById("apiKey");
const apiModelEl = document.getElementById("apiModel");
const webllmModelEl = document.getElementById("webllmModel");
const saveBtn = document.getElementById("save");
const testBtn = document.getElementById("test");
const statusEl = document.getElementById("status");

// Helper function to validate URL format
function isValidURL(url) {
  try {
    const urlObj = new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Toggle API settings visibility
useExternalAPIEl.addEventListener("change", () => {
  apiSettingsEl.style.display = useExternalAPIEl.checked ? "block" : "none";
});

// Auto-suggest model based on endpoint
apiEndpointEl.addEventListener("input", () => {
  const endpoint = apiEndpointEl.value.toLowerCase();
  let suggestedModel = "";
  
  if (endpoint.includes("openai")) {
    suggestedModel = "gpt-4";
  } else if (endpoint.includes("anthropic") || endpoint.includes("claude")) {
    suggestedModel = "claude-3-5-sonnet-20241022";
  } else if (endpoint.includes("ollama")) {
    suggestedModel = "llama3.2:3b";
  } else if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
    // For local endpoints, leave empty or suggest a common local model
    suggestedModel = "";
  }
  
  // Only set suggestion if field is empty
  if (!apiModelEl.value.trim() && suggestedModel) {
    apiModelEl.placeholder = `Suggested: ${suggestedModel}`;
  }
});

// Load saved settings
chrome.storage.sync.get({
  useExternalAPI: true,
  apiEndpoint: "http://localhost:1234/v1/chat/completions",
  apiKey: "",
  apiModel: "",
  webllmModel: "Llama-3.2-1B-Instruct-q4f16_1-MLC"
}, (settings) => {
  useExternalAPIEl.checked = settings.useExternalAPI;
  apiEndpointEl.value = settings.apiEndpoint;
  apiKeyEl.value = settings.apiKey;
  apiModelEl.value = settings.apiModel;
  webllmModelEl.value = settings.webllmModel;
  apiSettingsEl.style.display = settings.useExternalAPI ? "block" : "none";
});

// Save settings
saveBtn.addEventListener("click", () => {
  const endpoint = apiEndpointEl.value;
  
  // Validate API endpoint format
  if (!isValidURL(endpoint)) {
    showStatus("Please enter a valid API endpoint URL.", "error");
    return;
  }

  const apiKey = apiKeyEl.value;
  const apiModel = apiModelEl.value;
  const webllmModel = webllmModelEl.value;

  // Validate API key (if required)
  if (endpoint.includes("openai") && !apiKey) {
    showStatus("OpenAI requires an API key. Please enter one.", "error");
    return;
  }

  const settings = {
    useExternalAPI: useExternalAPIEl.checked,
    apiEndpoint: endpoint,
    apiKey: apiKey,
    apiModel: apiModel,
    webllmModel: webllmModel
  };

  chrome.storage.sync.set(settings, () => {
    showStatus("Settings saved successfully!", "success");
  });
});

// Test API connection
testBtn.addEventListener("click", async () => {
  if (!useExternalAPIEl.checked) {
    showStatus("External API is disabled. WebLLM will be used instead.", "error");
    return;
  }

  const endpoint = apiEndpointEl.value;
  const apiKey = apiKeyEl.value;
  const apiModel = apiModelEl.value;

  // Validate API endpoint format
  if (!isValidURL(endpoint)) {
    showStatus("Please enter a valid API endpoint URL.", "error");
    return;
  }

  // Validate API key (if required)
  if (endpoint.includes("openai") && !apiKey) {
    showStatus("OpenAI requires an API key. Please enter one.", "error");
    return;
  }
  
  // Warn about missing model for external APIs (optional but recommended)
  if (!apiModel.trim() && !endpoint.includes("localhost") && !endpoint.includes("127.0.0.1")) {
    showStatus("⚠️ No model specified. Some APIs require a model parameter.", "success");
  }

  showStatus("Testing connection...", "success");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "Authorization": `Bearer ${apiKey}` })
      },
      body: createRequestBody()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      showStatus("Connection successful! API is working.", "success");
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    // Improve error message clarity
    let errorMessage = `Connection failed: ${error.message}`;
    
    if (error.message.includes("401")) {
      errorMessage += "\n\nCheck your API key and endpoint URL.";
    } else if (error.message.includes("404")) {
      errorMessage += "\n\nCheck your API endpoint URL.";
    }
    
    showStatus(errorMessage, "error");
  }
});

// Helper function to create request body
function createRequestBody() {
  const apiModel = apiModelEl.value;
  const requestBody = {
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say 'Connection successful!'" }
    ],
    max_tokens: 50
  };
  
  // Add model if specified
  if (apiModel && apiModel.trim()) {
    requestBody.model = apiModel.trim();
  }
  
  return JSON.stringify(requestBody);
}

// Show status message
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
  setTimeout(() => {
    statusEl.className = "";
  }, 5000);
}
