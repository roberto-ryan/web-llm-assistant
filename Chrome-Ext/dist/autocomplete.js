(() => {
  // src/autocomplete.js
  var AutocompleteManager = class {
    constructor(inputElement, options = {}) {
      this.inputElement = inputElement;
      this.options = {
        triggerChar: "@",
        maxSuggestions: 10,
        caseSensitive: false,
        debounceDelay: 100,
        ...options
      };
      this.isActive = false;
      this.currentSuggestions = [];
      this.selectedIndex = -1;
      this.debounceTimer = null;
      this.providers = /* @__PURE__ */ new Map();
      this.init();
    }
    init() {
      this.createDropdownElement();
      this.attachEventListeners();
    }
    createDropdownElement() {
      this.dropdown = document.createElement("div");
      this.dropdown.className = "autocomplete-dropdown";
      this.dropdown.innerHTML = `
            <div class="autocomplete-header">
                <span class="autocomplete-title">Select Reference</span>
                <span class="autocomplete-shortcut">Tab to accept</span>
            </div>
            <div class="autocomplete-list"></div>
        `;
      const style = document.createElement("style");
      style.textContent = `
            .autocomplete-dropdown {
                position: absolute;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                max-height: 300px;
                width: 280px;
                z-index: 1000;
                display: none;
                overflow: hidden;
                font-family: system-ui, -apple-system, sans-serif;
            }
            
            .autocomplete-header {
                padding: 8px 12px;
                background: #1a1a1a;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
            }
            
            .autocomplete-title {
                color: #e0e0e0;
                font-weight: 500;
            }
            
            .autocomplete-shortcut {
                color: #888;
                font-size: 11px;
            }
            
            .autocomplete-list {
                max-height: 250px;
                overflow-y: auto;
            }
            
            .autocomplete-item {
                padding: 10px 12px;
                cursor: pointer;
                border-bottom: 1px solid #333;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: background-color 0.15s ease;
            }
            
            .autocomplete-item:last-child {
                border-bottom: none;
            }
            
            .autocomplete-item:hover,
            .autocomplete-item.selected {
                background: #3a4a5a;
            }
            
            .autocomplete-item.selected {
                position: relative;
            }
            
            .autocomplete-item.selected::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: #4a9eff;
            }
            
            .autocomplete-icon {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                font-size: 12px;
                flex-shrink: 0;
            }
            
            .autocomplete-icon.element {
                background: #2a3a4a;
                color: #4a9eff;
            }
            
            .autocomplete-icon.tool {
                background: #3a2a4a;
                color: #9f4aff;
            }
            
            .autocomplete-icon.command {
                background: #4a3a2a;
                color: #ff9f4a;
            }
            
            .autocomplete-icon.variable {
                background: #2a4a3a;
                color: #4aff9f;
            }
            
            .autocomplete-content {
                flex: 1;
                min-width: 0;
            }
            
            .autocomplete-name {
                color: #e0e0e0;
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 2px;
            }
            
            .autocomplete-description {
                color: #999;
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .autocomplete-type {
                color: #666;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-left: auto;
                flex-shrink: 0;
            }
        `;
      document.head.appendChild(style);
      document.body.appendChild(this.dropdown);
    }
    attachEventListeners() {
      this.inputElement.addEventListener("input", this.handleInput.bind(this));
      this.inputElement.addEventListener("keydown", this.handleKeydown.bind(this));
      this.inputElement.addEventListener("blur", this.handleBlur.bind(this));
      document.addEventListener("click", (e) => {
        if (!this.dropdown.contains(e.target) && e.target !== this.inputElement) {
          this.hideDropdown();
        }
      });
      this.dropdown.addEventListener("click", this.handleDropdownClick.bind(this));
    }
    handleInput(e) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.checkForTrigger();
      }, this.options.debounceDelay);
    }
    checkForTrigger() {
      const value = this.inputElement.value;
      const cursorPos = this.inputElement.selectionStart;
      const beforeCursor = value.substring(0, cursorPos);
      const triggerMatch = beforeCursor.match(new RegExp(`\\${this.options.triggerChar}([a-zA-Z_][a-zA-Z0-9_]*)$`));
      if (triggerMatch) {
        const query = triggerMatch[1];
        this.showSuggestions(query, cursorPos - triggerMatch[0].length);
      } else {
        this.hideDropdown();
      }
    }
    async showSuggestions(query, triggerPos) {
      const suggestions = await this.getSuggestions(query);
      if (suggestions.length === 0) {
        this.hideDropdown();
        return;
      }
      this.currentSuggestions = suggestions;
      this.selectedIndex = 0;
      this.triggerPos = triggerPos;
      this.renderSuggestions();
      this.positionDropdown();
      this.showDropdown();
    }
    async getSuggestions(query) {
      const allSuggestions = [];
      for (const [type, provider] of this.providers) {
        try {
          const suggestions = await provider.getSuggestions(query);
          allSuggestions.push(...suggestions.map((s) => ({ ...s, providerType: type })));
        } catch (error) {
          console.warn(`Error getting suggestions from provider ${type}:`, error);
        }
      }
      const filtered = this.filterSuggestions(allSuggestions, query);
      return filtered.slice(0, this.options.maxSuggestions);
    }
    filterSuggestions(suggestions, query) {
      if (!query)
        return suggestions;
      const queryLower = this.options.caseSensitive ? query : query.toLowerCase();
      return suggestions.filter((suggestion) => {
        const name = this.options.caseSensitive ? suggestion.name : suggestion.name.toLowerCase();
        return name.includes(queryLower);
      }).sort((a, b) => {
        const aName = this.options.caseSensitive ? a.name : a.name.toLowerCase();
        const bName = this.options.caseSensitive ? b.name : b.name.toLowerCase();
        if (aName === queryLower && bName !== queryLower)
          return -1;
        if (bName === queryLower && aName !== queryLower)
          return 1;
        const aStarts = aName.startsWith(queryLower);
        const bStarts = bName.startsWith(queryLower);
        if (aStarts && !bStarts)
          return -1;
        if (bStarts && !aStarts)
          return 1;
        return aName.localeCompare(bName);
      });
    }
    renderSuggestions() {
      const listElement = this.dropdown.querySelector(".autocomplete-list");
      listElement.innerHTML = "";
      this.currentSuggestions.forEach((suggestion, index) => {
        const item = document.createElement("div");
        item.className = `autocomplete-item ${index === this.selectedIndex ? "selected" : ""}`;
        item.dataset.index = index;
        item.innerHTML = `
                <div class="autocomplete-icon ${suggestion.type}">
                    ${this.getIconForType(suggestion.type)}
                </div>
                <div class="autocomplete-content">
                    <div class="autocomplete-name">${this.escapeHtml(suggestion.name)}</div>
                    <div class="autocomplete-description">${this.escapeHtml(suggestion.description || "")}</div>
                </div>
                <div class="autocomplete-type">${suggestion.type}</div>
            `;
        listElement.appendChild(item);
      });
    }
    getIconForType(type) {
      const icons = {
        element: "\u{1F3AF}",
        tool: "\u{1F527}",
        command: "\u26A1",
        variable: "\u{1F4DD}",
        function: "\u{1F528}"
      };
      return icons[type] || "\u{1F4CC}";
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    positionDropdown() {
      const inputRect = this.inputElement.getBoundingClientRect();
      const dropdownHeight = this.dropdown.offsetHeight || 300;
      const viewportHeight = window.innerHeight;
      let top = inputRect.bottom + 4;
      let left = inputRect.left;
      if (top + dropdownHeight > viewportHeight - 20) {
        top = inputRect.top - dropdownHeight - 4;
      }
      const maxLeft = window.innerWidth - this.dropdown.offsetWidth - 20;
      if (left > maxLeft) {
        left = maxLeft;
      }
      this.dropdown.style.left = `${left}px`;
      this.dropdown.style.top = `${top}px`;
    }
    showDropdown() {
      this.dropdown.style.display = "block";
      this.isActive = true;
    }
    hideDropdown() {
      this.dropdown.style.display = "none";
      this.isActive = false;
      this.selectedIndex = -1;
      this.currentSuggestions = [];
    }
    handleKeydown(e) {
      if (!this.isActive)
        return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentSuggestions.length - 1);
          this.renderSuggestions();
          break;
        case "ArrowUp":
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this.renderSuggestions();
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          this.acceptSuggestion();
          break;
        case "Escape":
          e.preventDefault();
          this.hideDropdown();
          break;
      }
    }
    handleDropdownClick(e) {
      const item = e.target.closest(".autocomplete-item");
      if (item) {
        this.selectedIndex = parseInt(item.dataset.index);
        this.acceptSuggestion();
      }
    }
    handleBlur(e) {
      setTimeout(() => {
        if (!this.dropdown.contains(document.activeElement)) {
          this.hideDropdown();
        }
      }, 150);
    }
    acceptSuggestion() {
      if (this.selectedIndex >= 0 && this.currentSuggestions[this.selectedIndex]) {
        const suggestion = this.currentSuggestions[this.selectedIndex];
        this.insertSuggestion(suggestion);
        this.hideDropdown();
      }
    }
    insertSuggestion(suggestion) {
      const value = this.inputElement.value;
      const cursorPos = this.inputElement.selectionStart;
      const beforeTrigger = value.substring(0, this.triggerPos);
      const afterCursor = value.substring(cursorPos);
      let insertText = suggestion.name;
      if (suggestion.type === "variable" && suggestion.value !== void 0) {
        insertText = suggestion.value;
      } else if (suggestion.type === "command") {
        insertText = suggestion.name;
      }
      const newValue = beforeTrigger + this.options.triggerChar + insertText + " " + afterCursor;
      const newCursorPos = beforeTrigger.length + this.options.triggerChar.length + insertText.length + 1;
      this.inputElement.value = newValue;
      this.inputElement.setSelectionRange(newCursorPos, newCursorPos);
      this.inputElement.focus();
      this.inputElement.dispatchEvent(new Event("input", { bubbles: true }));
      if (this.options.onSelect) {
        this.options.onSelect(suggestion);
      }
    }
    // Provider management
    registerProvider(type, provider) {
      this.providers.set(type, provider);
    }
    unregisterProvider(type) {
      this.providers.delete(type);
    }
    // Utility method to manually trigger autocomplete
    triggerAutocomplete() {
      this.checkForTrigger();
    }
    // Cleanup
    destroy() {
      clearTimeout(this.debounceTimer);
      this.dropdown.remove();
    }
  };
  var ElementProvider = class {
    constructor(elementPickerController) {
      this.elementPickerController = elementPickerController;
    }
    async getSuggestions(query) {
      const elements = this.elementPickerController.getAllElements();
      return elements.map((element) => ({
        name: element.displayName,
        description: `${element.name} - ${element.data.tagName}${element.data.id ? "#" + element.data.id : ""}${element.data.className ? "." + element.data.className.split(" ")[0] : ""}`,
        type: "element",
        data: element
      }));
    }
  };
  var ToolProvider = class {
    constructor() {
      this.tools = [
        { name: "picker", description: "Element picker tool", type: "tool" },
        { name: "clear", description: "Clear chat history", type: "tool" },
        { name: "export", description: "Export conversation", type: "tool" },
        { name: "settings", description: "Open settings", type: "tool" }
      ];
    }
    async getSuggestions(query) {
      return this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        type: tool.type,
        data: tool
      }));
    }
  };
  window.AutocompleteManager = AutocompleteManager;
  window.ElementProvider = ElementProvider;
  window.ToolProvider = ToolProvider;
})();
