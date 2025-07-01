(() => {
  // src/autocomplete-config.js
  var AutocompleteConfig = class {
    constructor() {
      this.providers = [];
      this.settings = {
        triggerChar: "@",
        maxSuggestions: 10,
        caseSensitive: false,
        debounceDelay: 150
      };
    }
    // Add a new provider
    addProvider(type, providerClass, options = {}) {
      this.providers.push({
        type,
        providerClass,
        options
      });
    }
    // Get all registered providers
    getProviders() {
      return this.providers;
    }
    // Update settings
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    }
    // Get current settings
    getSettings() {
      return this.settings;
    }
  };
  var CommandProvider = class {
    constructor() {
      this.commands = [
        {
          name: "help",
          description: "Show available commands and features",
          type: "command",
          action: () => this.showHelp()
        },
        {
          name: "clear",
          description: "Clear the current chat conversation",
          type: "command",
          action: () => this.clearChat()
        },
        {
          name: "picker",
          description: "Activate element picker tool",
          type: "command",
          action: () => this.activatePicker()
        },
        {
          name: "elements",
          description: "List all saved elements",
          type: "command",
          action: () => this.listElements()
        },
        {
          name: "export",
          description: "Export current conversation",
          type: "command",
          action: () => this.exportConversation()
        }
      ];
    }
    async getSuggestions(query) {
      return this.commands.map((command) => ({
        name: command.name,
        description: command.description,
        type: command.type,
        data: command,
        action: command.action
      }));
    }
    showHelp() {
      const helpMessage = `
**Available @ Commands:**
- @help - Show this help message
- @clear - Clear chat history
- @picker - Activate element picker
- @elements - List saved elements
- @export - Export conversation

**Element References:**
Type @ followed by element names to reference saved page elements.

**Usage Tips:**
- Use Tab or Enter to accept suggestions
- Use Arrow keys to navigate suggestions
- Press Escape to close the dropdown
        `.trim();
      if (typeof window !== "undefined" && window.addMessage) {
        window.addMessage(helpMessage, "system");
      } else {
        console.log(helpMessage);
      }
    }
    clearChat() {
      if (typeof window !== "undefined" && window.handleNewChat) {
        window.handleNewChat();
      } else if (typeof window !== "undefined" && window.messagesDiv && window.messages) {
        window.messagesDiv.innerHTML = "";
        window.messages.length = 0;
      } else {
        console.log("Clear chat command executed");
      }
    }
    activatePicker() {
      if (typeof window !== "undefined" && window.elementPickerController && window.elementPickerController.togglePicker) {
        window.elementPickerController.togglePicker();
        if (window.addMessage) {
          window.addMessage("\u{1F3AF} Element picker activated. Click on any element on the webpage to select it.", "system");
        }
      } else {
        console.log("Element picker activation command executed");
      }
    }
    listElements() {
      if (typeof window !== "undefined" && window.elementPickerController && window.elementPickerController.getAllElements) {
        const elements = window.elementPickerController.getAllElements();
        if (elements.length === 0) {
          if (window.addMessage) {
            window.addMessage("\u{1F4CC} No elements saved yet. Use the element picker to save some elements first.", "system");
          }
        } else {
          const elementList = elements.map(
            (el) => `\u2022 @${el.displayName} - ${el.name} (${el.data.tagName})`
          ).join("\n");
          if (window.addMessage) {
            window.addMessage(`\u{1F4CC} **Saved Elements:**
${elementList}`, "system");
          }
        }
      } else {
        console.log("List elements command executed");
      }
    }
    exportConversation() {
      if (typeof window !== "undefined" && window.messages && window.messages.length > 0) {
        const exportData = {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          messages: window.messages,
          elementCount: window.elementPickerController ? window.elementPickerController.getAllElements().length : 0
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.addMessage) {
          window.addMessage("\u{1F4BE} Conversation exported successfully!", "system");
        }
      } else {
        console.log("Export conversation command executed");
      }
    }
  };
  var VariableProvider = class {
    constructor() {
      this.variables = [
        {
          name: "url",
          description: "Current page URL",
          type: "variable",
          getValue: () => window.location.href
        },
        {
          name: "title",
          description: "Current page title",
          type: "variable",
          getValue: () => document.title
        },
        {
          name: "domain",
          description: "Current domain",
          type: "variable",
          getValue: () => window.location.hostname
        },
        {
          name: "timestamp",
          description: "Current timestamp",
          type: "variable",
          getValue: () => (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
    }
    async getSuggestions(query) {
      return this.variables.map((variable) => ({
        name: variable.name,
        description: `${variable.description}: ${variable.getValue()}`,
        type: variable.type,
        data: variable,
        value: variable.getValue()
      }));
    }
  };
  var defaultAutocompleteConfig = new AutocompleteConfig();
  defaultAutocompleteConfig.addProvider("commands", CommandProvider);
  defaultAutocompleteConfig.addProvider("variables", VariableProvider);
  window.AutocompleteConfig = AutocompleteConfig;
  window.CommandProvider = CommandProvider;
  window.VariableProvider = VariableProvider;
  window.defaultAutocompleteConfig = defaultAutocompleteConfig;
})();
