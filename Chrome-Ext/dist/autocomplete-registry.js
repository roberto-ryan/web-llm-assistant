(() => {
  // src/autocomplete-registry.js
  var AutocompleteRegistry = class {
    constructor() {
      this.entries = [];
      this.listeners = [];
      this.loadFromStorage();
    }
    // Register a single entry or array of entries
    register(entries) {
      if (!Array.isArray(entries)) {
        entries = [entries];
      }
      entries.forEach((entry) => {
        if (this.validateEntry(entry)) {
          this.entries.push(entry);
          this.notifyListeners("add", entry);
        } else {
          console.warn("Invalid autocomplete entry:", entry);
        }
      });
      this.saveToStorage();
    }
    // Unregister entries by name or filter function
    unregister(filter) {
      let removed = [];
      if (typeof filter === "string") {
        removed = this.entries.filter((entry) => entry.name === filter);
        this.entries = this.entries.filter((entry) => entry.name !== filter);
      } else if (typeof filter === "function") {
        removed = this.entries.filter(filter);
        this.entries = this.entries.filter((entry) => !filter(entry));
      }
      removed.forEach((entry) => this.notifyListeners("remove", entry));
      this.saveToStorage();
      return removed.length;
    }
    // Get all entries or filtered entries
    getEntries(filter = null) {
      if (!filter)
        return [...this.entries];
      if (typeof filter === "string") {
        const query = filter.toLowerCase();
        return this.entries.filter(
          (entry) => entry.name.toLowerCase().includes(query) || entry.description && entry.description.toLowerCase().includes(query)
        );
      } else if (typeof filter === "function") {
        return this.entries.filter(filter);
      }
      return [...this.entries];
    }
    // Validate entry format
    validateEntry(entry) {
      return entry && typeof entry.name === "string" && entry.name.length > 0 && typeof entry.type === "string";
    }
    // Add listener for registry changes
    addListener(callback) {
      this.listeners.push(callback);
    }
    // Remove listener
    removeListener(callback) {
      this.listeners = this.listeners.filter((l) => l !== callback);
    }
    // Notify listeners of changes
    notifyListeners(action, entry) {
      this.listeners.forEach((callback) => {
        try {
          callback(action, entry, this.entries);
        } catch (error) {
          console.error("Autocomplete registry listener error:", error);
        }
      });
    }
    // Load entries from Chrome storage
    async loadFromStorage() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await chrome.storage.local.get(["autocomplete_registry"]);
          if (result.autocomplete_registry) {
            this.entries = result.autocomplete_registry.filter((entry) => this.validateEntry(entry));
          }
        }
      } catch (error) {
        console.warn("Could not load autocomplete registry from storage:", error);
      }
    }
    // Save entries to Chrome storage
    async saveToStorage() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          await chrome.storage.local.set({
            autocomplete_registry: this.entries
          });
        }
      } catch (error) {
        console.warn("Could not save autocomplete registry to storage:", error);
      }
    }
    // Clear all entries
    clear() {
      const count = this.entries.length;
      this.entries = [];
      this.saveToStorage();
      this.notifyListeners("clear", null);
      return count;
    }
    // Import entries from JSON
    importFromJSON(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
          this.register(data);
          return data.length;
        } else if (data.entries && Array.isArray(data.entries)) {
          this.register(data.entries);
          return data.entries.length;
        }
      } catch (error) {
        console.error("Error importing autocomplete entries:", error);
      }
      return 0;
    }
    // Export entries to JSON
    exportToJSON() {
      return JSON.stringify({
        version: "1.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        count: this.entries.length,
        entries: this.entries
      }, null, 2);
    }
  };
  window.autocompleteRegistry = new AutocompleteRegistry();
  window.registerAutocomplete = function(entries) {
    return window.autocompleteRegistry.register(entries);
  };
  window.getAutocompleteEntries = function(filter) {
    return window.autocompleteRegistry.getEntries(filter);
  };
  var ENTRY_TEMPLATES = {
    command: (name, description, action) => ({
      name,
      description,
      type: "cmd",
      action: action || (() => console.log(`Command: ${name}`))
    }),
    variable: (name, description, getValue) => ({
      name,
      description,
      type: "var",
      getValue: getValue || (() => `[${name}]`)
    }),
    snippet: (name, description, content) => ({
      name,
      description,
      type: "snippet",
      content: content || `Template: ${name}`
    }),
    element: (name, description, selector) => ({
      name,
      description,
      type: "elem",
      selector: selector || name
    })
  };
  window.createAutocompleteEntry = function(type, name, description, extra) {
    if (ENTRY_TEMPLATES[type]) {
      return ENTRY_TEMPLATES[type](name, description, extra);
    }
    return {
      name,
      description,
      type,
      ...extra
    };
  };
  window.autocompleteRegistry.register([
    ENTRY_TEMPLATES.command("help", "Show autocomplete help"),
    ENTRY_TEMPLATES.command("clear", "Clear chat history"),
    ENTRY_TEMPLATES.command("picker", "Activate element picker"),
    ENTRY_TEMPLATES.command("export", "Export conversation")
  ]);
  console.log("\u2713 Autocomplete registry initialized with", window.autocompleteRegistry.entries.length, "entries");
})();
