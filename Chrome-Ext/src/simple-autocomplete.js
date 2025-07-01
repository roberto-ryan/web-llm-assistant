(() => {
  // src/simple-autocomplete.js
  var SimpleAutocomplete = class {
    constructor(inputElement) {
      this.inputElement = inputElement;
      this.dropdown = null;
      this.suggestions = [];
      this.selectedIndex = 0;
      this.isVisible = false;
      this.init();
    }
    init() {
      this.createDropdown();
      this.attachEvents();
    }
    createDropdown() {
      this.dropdown = document.createElement("div");
      this.dropdown.className = "simple-autocomplete";
      this.dropdown.style.cssText = `
            position: absolute;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            max-height: 200px;
            width: 250px;
            z-index: 1000;
            display: none;
            overflow-y: auto;
            font-family: system-ui, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
      document.body.appendChild(this.dropdown);
    }
    attachEvents() {
      this.inputElement.addEventListener("input", (e) => this.handleInput(e));
      this.inputElement.addEventListener("keydown", (e) => this.handleKeydown(e));
      this.inputElement.addEventListener("blur", () => setTimeout(() => this.hide(), 150));
      document.addEventListener("click", (e) => {
        if (!this.dropdown.contains(e.target))
          this.hide();
      });
    }
    handleInput(e) {
      const value = e.target.value;
      const pos = e.target.selectionStart;
      const beforeCursor = value.substring(0, pos);
      const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
      if (match) {
        const query = match[1];
        this.triggerPos = pos - match[0].length;
        this.showSuggestions(query);
      } else {
        this.hide();
      }
    }
    handleKeydown(e) {
      if (!this.isVisible)
        return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.render();
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.selectCurrent();
        return false;
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      }
    }
    showSuggestions(query) {
      this.suggestions = this.getSuggestions(query);
      if (this.suggestions.length === 0) {
        this.hide();
        return;
      }
      this.selectedIndex = 0;
      this.render();
      this.position();
      this.show();
    }
    getSuggestions(query) {
      // Get elements first - they should always be shown
      const elements = this.getElements();
      
      // Filter elements if there's a query
      const filteredElements = query ? 
        elements.filter(el => el.name.toLowerCase().includes(query.toLowerCase())) : 
        elements;
      
      let otherSuggestions = [];
      
      if (window.autocompleteRegistry) {
        // Get non-element suggestions from registry
        const registryEntries = window.autocompleteRegistry.getEntries(query);
        otherSuggestions = registryEntries.filter(item => item.type !== "elem");
      } else {
        // Default suggestions
        const defaultSuggestions = [
          // Commands
          { name: "help", description: "Show help", type: "cmd" },
          { name: "clear", description: "Clear chat", type: "cmd" },
          { name: "picker", description: "Element picker", type: "cmd" },
          { name: "export", description: "Export chat", type: "cmd" },
          // Variables
          { name: "url", description: window.location.href, type: "var" },
          { name: "title", description: document.title, type: "var" },
          { name: "domain", description: window.location.hostname, type: "var" }
        ];
        
        // Filter by query if provided
        otherSuggestions = query ? 
          defaultSuggestions.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) :
          defaultSuggestions;
      }
      
      // Combine with elements first
      const allSuggestions = [...filteredElements, ...otherSuggestions];
      
      return allSuggestions.slice(0, 8);
    }
    getElements() {
      if (window.elementPickerController && window.elementPickerController.getAllElements) {
        return window.elementPickerController.getAllElements().map((el) => ({
          name: el.displayName,
          description: el.name,
          type: "elem"
        }));
      }
      return [];
    }
    render() {
      this.dropdown.innerHTML = this.suggestions.map((item, i) => `
            <div class="autocomplete-item ${i === this.selectedIndex ? "selected" : ""}" 
                 data-index="${i}"
                 style="padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; 
                        border-bottom: 1px solid #333; color: #e0e0e0;
                        ${i === this.selectedIndex ? "background: #3a4a5a;" : ""}">
                <div>
                    <div style="font-weight: 500;">${item.name}</div>
                    <div style="font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${item.description || item.desc || ""}</div>
                </div>
                <div style="font-size: 11px; color: #666; text-transform: uppercase;">${item.type}</div>
            </div>
        `).join("");
      this.dropdown.querySelectorAll(".autocomplete-item").forEach((item, i) => {
        item.addEventListener("click", () => {
          this.selectedIndex = i;
          this.selectCurrent();
        });
      });
    }
    selectCurrent() {
      if (this.suggestions[this.selectedIndex]) {
        const suggestion = this.suggestions[this.selectedIndex];
        this.insert(suggestion);
        // Use setTimeout to ensure the insertion completes before hiding
        setTimeout(() => this.hide(), 0);
      }
    }
    insert(suggestion) {
      const value = this.inputElement.value;
      const beforeTrigger = value.substring(0, this.triggerPos);
      const afterCursor = value.substring(this.inputElement.selectionStart);
      
      // For commands, execute them without inserting text
      if (suggestion.type === "cmd") {
        // Clear the @ trigger from input
        const newValue = beforeTrigger + afterCursor;
        this.inputElement.value = newValue;
        this.inputElement.setSelectionRange(beforeTrigger.length, beforeTrigger.length);
        this.inputElement.focus();
        
        // Execute the command
        if (suggestion.action && typeof suggestion.action === "function") {
          suggestion.action();
        } else {
          this.executeCommand(suggestion.name);
        }
        return;
      }
      
      let insertText = suggestion.name;
      if (suggestion.type === "var") {
        if (suggestion.getValue && typeof suggestion.getValue === "function") {
          insertText = suggestion.getValue();
        } else {
          insertText = suggestion.description || suggestion.desc || suggestion.name;
        }
      } else if (suggestion.type === "snippet") {
        if (suggestion.content) {
          this.inputElement.value = suggestion.content;
          this.inputElement.focus();
          const firstPlaceholder = suggestion.content.indexOf("[");
          if (firstPlaceholder !== -1) {
            const endPlaceholder = suggestion.content.indexOf("]", firstPlaceholder);
            if (endPlaceholder !== -1) {
              this.inputElement.setSelectionRange(firstPlaceholder, endPlaceholder + 1);
            }
          }
          return;
        }
      }
      const newValue = beforeTrigger + "@" + insertText + " " + afterCursor;
      const newPos = beforeTrigger.length + insertText.length + 2;
      this.inputElement.value = newValue;
      this.inputElement.setSelectionRange(newPos, newPos);
      this.inputElement.focus();
    }
    executeCommand(cmd) {
      switch (cmd) {
        case "help":
          if (window.addMessage) {
            window.addMessage("\u{1F4A1} **Quick Help:**\n- Type @ to see suggestions\n- @clear - Clear chat\n- @picker - Select elements\n- @url, @title - Insert page info", "system");
          }
          break;
        case "clear":
          if (window.handleNewChat)
            window.handleNewChat();
          break;
        case "picker":
          if (window.elementPickerController)
            window.elementPickerController.togglePicker();
          break;
        case "export":
          this.exportChat();
          break;
      }
    }
    exportChat() {
      if (window.messages && window.messages.length > 0) {
        const data = JSON.stringify(window.messages, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
    position() {
      const rect = this.inputElement.getBoundingClientRect();
      const dropdownHeight = this.dropdown.offsetHeight || 200;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      let top, left;
      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        top = rect.bottom + 4;
      } else {
        top = rect.top - dropdownHeight - 4;
      }
      left = rect.left;
      const dropdownWidth = this.dropdown.offsetWidth || 250;
      const maxLeft = window.innerWidth - dropdownWidth - 10;
      if (left > maxLeft) {
        left = maxLeft;
      }
      if (left < 10) {
        left = 10;
      }
      if (top < 10) {
        top = 10;
      } else if (top + dropdownHeight > viewportHeight - 10) {
        top = viewportHeight - dropdownHeight - 10;
      }
      this.dropdown.style.left = left + "px";
      this.dropdown.style.top = top + "px";
    }
    show() {
      this.dropdown.style.display = "block";
      this.isVisible = true;
      setTimeout(() => this.position(), 0);
    }
    hide() {
      this.dropdown.style.display = "none";
      this.isVisible = false;
    }
  };
  window.SimpleAutocomplete = SimpleAutocomplete;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSimpleAutocomplete);
  } else {
    initSimpleAutocomplete();
  }
  function initSimpleAutocomplete() {
    const inputEl = document.getElementById("input") || document.querySelector('textarea[placeholder*="Ask"]');
    if (inputEl && !inputEl._autocomplete) {
      inputEl._autocomplete = new SimpleAutocomplete(inputEl);
      console.log("\u2713 Simple autocomplete initialized");
    }
  }
})();
