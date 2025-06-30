// Elements
const useExternalAPIEl = document.getElementById("useExternalAPI");
const apiSettingsEl = document.getElementById("apiSettings");
const apiEndpointEl = document.getElementById("apiEndpoint");
const apiKeyEl = document.getElementById("apiKey");
const webllmModelEl = document.getElementById("webllmModel");
const saveBtn = document.getElementById("save");
const testBtn = document.getElementById("test");
const statusEl = document.getElementById("status");

// Toggle API settings visibility
useExternalAPIEl.addEventListener("change", () => {
  apiSettingsEl.style.display = useExternalAPIEl.checked ? "block" : "none";
});

// Load saved settings
chrome.storage.sync.get({
  useExternalAPI: true,
  apiEndpoint: "http://localhost:1234/v1/chat/completions",
  apiKey: "",
  webllmModel: "Llama-3.2-1B-Instruct-q4f16_1-MLC"
}, (settings) => {
  useExternalAPIEl.checked = settings.useExternalAPI;
  apiEndpointEl.value = settings.apiEndpoint;
  apiKeyEl.value = settings.apiKey;
  webllmModelEl.value = settings.webllmModel;
  apiSettingsEl.style.display = settings.useExternalAPI ? "block" : "none";
});

// Save settings
saveBtn.addEventListener("click", () => {
  const settings = {
    useExternalAPI: useExternalAPIEl.checked,
    apiEndpoint: apiEndpointEl.value,
    apiKey: apiKeyEl.value,
    webllmModel: webllmModelEl.value
  };
  
  chrome.storage.sync.set(settings, () => {
    showStatus("Settings saved successfully!", "success");
  });
});

// Test connection
testBtn.addEventListener("click", async () => {
  if (!useExternalAPIEl.checked) {
    showStatus("External API is disabled. Enable it to test connection.", "error");
    return;
  }
  
  const endpoint = apiEndpointEl.value;
  const apiKey = apiKeyEl.value;
  
  if (!endpoint) {
    showStatus("Please enter an API endpoint.", "error");
    return;
  }
  
  showStatus("Testing connection...", "success");
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "Authorization": `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say 'Connection successful!'" }
        ],
        max_tokens: 50
      })
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
    showStatus(`Connection failed: ${error.message}`, "error");
  }
});

// Show status message
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
  setTimeout(() => {
    statusEl.className = "";
  }, 5000);
}