const modelSelect = document.getElementById("model") as HTMLSelectElement;
const temperatureSelect = document.getElementById(
  "temperature",
) as HTMLSelectElement;
const contextSelect = document.getElementById("context") as HTMLSelectElement;

chrome.storage.sync.get(
  {
    temperature: 0.5,
    contextLength: 16384,
    model: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  },
  (items) => {
    modelSelect.value = items.model;
    temperatureSelect.value = items.temperature;
    contextSelect.value = items.contextLength;
  },
);

modelSelect.onchange = () => {
  chrome.storage.sync.set({ model: modelSelect.value });
};
temperatureSelect.onchange = () => {
  chrome.storage.sync.set({ temperature: parseFloat(temperatureSelect.value) });
};
contextSelect.onchange = () => {
  chrome.storage.sync.set({ contextLength: parseInt(contextSelect.value) });
};
