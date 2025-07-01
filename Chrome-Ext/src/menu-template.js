// Menu HTML template as a JavaScript module
export const menuHTML = `
  <!-- Menu Overlay -->
  <div id="menu-overlay"></div>
  
  <!-- Sliding Menu -->
  <div id="slide-menu">
    <div id="menu-header">
      <span id="menu-title">Tools & Settings</span>
      <button id="menu-close">×</button>
    </div>
    <div id="menu-content">
      <!-- Chat Tools Section -->
      <div class="menu-section">
        <div class="menu-section-header">Chat Tools</div>
        <button class="menu-item" data-tool="export">Export Chat</button>
        <button class="menu-item" data-tool="templates">Message Templates</button>
        <button class="menu-item" data-tool="elements">Manage Elements</button>
      </div>
      
      <!-- Tool Panels -->
      <div class="tool-panel" id="tool-templates">
        <h3>Message Templates</h3>
        <p>Quick message templates for common tasks.</p>
        <button class="menu-item">Explain this code</button>
        <button class="menu-item">Summarize this page</button>
        <button class="menu-item">Translate to English</button>
        <button class="menu-item">Find bugs in code</button>
      </div>
      
      <div class="tool-panel" id="tool-export">
        <h3>Export Chat</h3>
        <p>Export your conversation to a file.</p>
        <button class="menu-item">Export as JSON</button>
        <button class="menu-item">Export as Markdown</button>
      </div>
      
      <div class="tool-panel" id="tool-elements">
        <h3>Stored Elements</h3>
        <p>Manage your saved page elements.</p>
        <div id="elements-list">
          <!-- Elements will be populated here -->
        </div>
        <button class="menu-item" id="clear-elements-btn">Clear All Elements</button>
        <button class="menu-item" id="refresh-elements-btn">Refresh List</button>
      </div>
    </div>
  </div>
`;

// Menu functionality
export class MenuManager {
  constructor(inputElement) {
    this.inputEl = inputElement;
    this.menuBtn = null;
    this.menuOverlay = null;
    this.slideMenu = null;
    this.menuClose = null;
    this.menuItems = null;
    this.toolPanels = null;
  }

  init() {
    // Inject menu HTML
    document.body.insertAdjacentHTML('afterbegin', menuHTML);
    
    // Get DOM elements
    this.menuBtn = document.getElementById("menu-btn");
    this.menuOverlay = document.getElementById("menu-overlay");
    this.slideMenu = document.getElementById("slide-menu");
    this.menuClose = document.getElementById("menu-close");
    this.menuItems = document.querySelectorAll(".menu-item[data-tool]");
    this.toolPanels = document.querySelectorAll(".tool-panel");
    
    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.menuBtn?.addEventListener("click", () => this.toggleMenu());
    this.menuClose?.addEventListener("click", () => this.closeMenu());
    this.menuOverlay?.addEventListener("click", () => this.closeMenu());

    // Handle menu item clicks
    this.menuItems?.forEach(item => {
      item.addEventListener("click", (e) => {
        const toolId = e.target.getAttribute("data-tool");
        this.showToolPanel(toolId);
      });
    });

    // Handle template clicks
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("menu-item") && 
          e.target.closest("#tool-templates")) {
        this.handleTemplateClick(e);
      }
    });

    // Handle export clicks
    document.addEventListener("click", (e) => {
      if (e.target.textContent === "Export as JSON") {
        this.exportAsJSON();
      } else if (e.target.textContent === "Export as Markdown") {
        this.exportAsMarkdown();
      }
    });

    // Handle element management clicks
    document.addEventListener("click", (e) => {
      if (e.target.id === "clear-elements-btn") {
        this.handleClearElements();
      } else if (e.target.id === "refresh-elements-btn") {
        this.refreshElementsList();
      }
    });

    // Close menu with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.slideMenu?.classList.contains("active")) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    const isActive = this.slideMenu?.classList.contains("active");
    if (isActive) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.slideMenu?.classList.add("active");
    this.menuOverlay?.classList.add("active");
    this.menuBtn?.classList.add("active");
    
    // Hide all tool panels when opening menu
    this.toolPanels?.forEach(panel => panel.classList.remove("active"));
    this.menuItems?.forEach(item => item.classList.remove("active"));
  }

  closeMenu() {
    this.slideMenu?.classList.remove("active");
    this.menuOverlay?.classList.remove("active");
    this.menuBtn?.classList.remove("active");
    
    // Hide all tool panels
    this.toolPanels?.forEach(panel => panel.classList.remove("active"));
    this.menuItems?.forEach(item => item.classList.remove("active"));
  }

  showToolPanel(toolId) {
    // Hide all tool panels first
    this.toolPanels?.forEach(panel => panel.classList.remove("active"));
    this.menuItems?.forEach(item => item.classList.remove("active"));
    
    // Show the selected tool panel
    const targetPanel = document.getElementById(`tool-${toolId}`);
    const targetItem = document.querySelector(`[data-tool="${toolId}"]`);
    
    if (targetPanel) {
      targetPanel.classList.add("active");
    }
    if (targetItem) {
      targetItem.classList.add("active");
    }
    
    // If showing elements panel, refresh the list
    if (toolId === 'elements') {
      this.refreshElementsList();
    }
  }

  handleTemplateClick(e) {
    const templates = {
      "Explain this code": "Please explain the selected code and how it works.",
      "Summarize this page": "Please provide a summary of this page's main content.",
      "Translate to English": "Please translate the selected text to English.",
      "Find bugs in code": "Please review the selected code and identify any potential bugs or issues."
    };
    
    const templateText = templates[e.target.textContent];
    if (templateText && this.inputEl) {
      this.inputEl.value = templateText;
      this.inputEl.focus();
      this.closeMenu();
    }
  }

  // Export chat functionality
  exportAsJSON() {
    const messages = window.messages || [];
    if (!messages.length) return alert("No conversation to export!");
    
    const data = { timestamp: new Date().toISOString(), messages };
    this.download(JSON.stringify(data, null, 2), 'json');
    this.closeMenu();
  }

  exportAsMarkdown() {
    const messages = window.messages || [];
    if (!messages.length) return alert("No conversation to export!");
    
    let md = `# Chat Export\n\n`;
    messages.forEach(msg => {
      const role = msg.role === "user" ? "👤 User" : "🤖 Assistant";
      md += `## ${role}\n\n${msg.content}\n\n---\n\n`;
    });
    
    this.download(md, 'md');
    this.closeMenu();
  }

  download(content, ext) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content]));
    link.download = `chat-${Date.now()}.${ext}`;
    link.click();
  }

  // Element management functionality
  refreshElementsList() {
    const listContainer = document.getElementById('elements-list');
    if (!listContainer) return;
    
    // Get elements from the controller (assuming it's globally accessible)
    const elements = window.elementPickerController?.getAllElements() || [];
    
    if (elements.length === 0) {
      listContainer.innerHTML = '<p style="color: #999; font-style: italic;">No stored elements</p>';
      return;
    }
    
    listContainer.innerHTML = elements.map(el => `
      <div style="padding: 8px; margin: 4px 0; background: #333; border-radius: 4px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>@${el.displayName}</strong> - ${el.name}
            <br>
            <span style="color: #999;">${el.data.text ? el.data.text.slice(0, 30) + '...' : 'No text'}</span>
          </div>
          <button class="rename-element-btn" data-element="${el.id}" style="
            background: #ff6b35; 
            color: white; 
            border: none; 
            padding: 4px 8px; 
            border-radius: 3px; 
            cursor: pointer; 
            font-size: 10px;
          ">Rename</button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for rename buttons
    listContainer.querySelectorAll('.rename-element-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const elementId = e.target.getAttribute('data-element');
        this.handleRenameElement(elementId);
      });
    });
  }

  handleClearElements() {
    if (confirm('Are you sure you want to clear all stored elements? This cannot be undone.')) {
      window.elementPickerController?.clearStoredElements();
      this.refreshElementsList();
    }
  }

  handleRenameElement(elementId) {
    const element = window.elementPickerController?.getElementData(elementId);
    if (!element) return;
    
    const currentName = element.customName || elementId;
    const newName = prompt(`Rename "@${currentName}" to:`, currentName);
    
    if (newName && newName !== currentName) {
      window.elementPickerController?.renameElement(currentName, newName).then(() => {
        this.refreshElementsList();
      });
    }
  }
}
