// src/options.js
var useExternalAPIEl = document.getElementById("useExternalAPI");
var apiSettingsEl = document.getElementById("apiSettings");
var apiEndpointEl = document.getElementById("apiEndpoint");
var apiKeyEl = document.getElementById("apiKey");
var webllmModelEl = document.getElementById("webllmModel");
var saveBtn = document.getElementById("save");
var testBtn = document.getElementById("test");
var statusEl = document.getElementById("status");
useExternalAPIEl.addEventListener("change", () => {
  apiSettingsEl.style.display = useExternalAPIEl.checked ? "block" : "none";
});
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
testBtn.addEventListener("click", async () => {
  if (!useExternalAPIEl.checked) {
    showStatus("External API is disabled. WebLLM will be used instead.", "error");
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
        ...apiKey && { "Authorization": `Bearer ${apiKey}` }
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
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
  setTimeout(() => {
    statusEl.className = "";
  }, 5e3);
}
