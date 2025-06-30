// Simplified options script
const apiEndpointEl = document.getElementById("apiEndpoint");
const apiKeyEl = document.getElementById("apiKey");
const saveBtn = document.getElementById("save");
const testBtn = document.getElementById("test");
const statusEl = document.getElementById("status");

// Load saved settings
chrome.storage.sync.get({
  apiEndpoint: "http://localhost:1234/v1/chat/completions",
  apiKey: ""
}, (settings) => {
  apiEndpointEl.value = settings.apiEndpoint;
  apiKeyEl.value = settings.apiKey;
});

// Save settings
saveBtn.addEventListener("click", () => {
  const settings = {
    apiEndpoint: apiEndpointEl.value,
    apiKey: apiKeyEl.value
  };
  
  chrome.storage.sync.set(settings, () => {
    showStatus("Settings saved successfully!", "success");
  });
});

// Test connection
testBtn.addEventListener("click", async () => {
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