// Menu management module
export class MenuManager {
  constructor() {
    this.menuBtn = null;
    this.menuOverlay = null;
    this.slideMenu = null;
    this.menuClose = null;
    this.menuItems = null;
    this.toolPanels = null;
    this.inputEl = null;
    
    this.isInitialized = false;
  }

  async init(inputElement) {
    this.inputEl = inputElement;
    
    // Load and inject menu HTML
    await this.loadMenuHTML();
    
    // Get DOM elements
    this.menuBtn = document.getElementById("menu-btn");
    this.menuOverlay = document.getElementById("menu-overlay");
    this.slideMenu = document.getElementById("slide-menu");
    this.menuClose = document.getElementById("menu-close");
    this.menuItems = document.querySelectorAll(".menu-item[data-tool]");
    this.toolPanels = document.querySelectorAll(".tool-panel");
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
  }

  async loadMenuHTML() {
    try {
      const response = await fetch('menu.html');
      const menuHTML = await response.text();
      
      // Insert menu HTML at the beginning of body
      document.body.insertAdjacentHTML('afterbegin', menuHTML);
    } catch (error) {
      console.error('Failed to load menu HTML:', error);
    }
  }

  setupEventListeners() {
    if (!this.isInitialized) return;

    // Menu toggle
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
  }

  insertTemplate(template) {
    if (this.inputEl) {
      this.inputEl.value = template;
      this.inputEl.focus();
      this.closeMenu();
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
    if (templateText) {
      this.insertTemplate(templateText);
    }
  }

  // Method to add new menu sections dynamically
  addMenuSection(sectionConfig) {
    const menuContent = document.getElementById("menu-content");
    if (!menuContent) return;

    const sectionHTML = `
      <div class="menu-section">
        <div class="menu-section-header">${sectionConfig.title}</div>
        ${sectionConfig.items.map(item => 
          `<button class="menu-item" data-tool="${item.id}">${item.label}</button>`
        ).join('')}
      </div>
    `;

    menuContent.insertAdjacentHTML('beforeend', sectionHTML);
    
    // Add tool panels for new items
    sectionConfig.items.forEach(item => {
      if (item.panel) {
        const panelHTML = `
          <div class="tool-panel" id="tool-${item.id}">
            ${item.panel}
          </div>
        `;
        menuContent.insertAdjacentHTML('beforeend', panelHTML);
      }
    });

    // Re-setup event listeners for new items
    this.menuItems = document.querySelectorAll(".menu-item[data-tool]");
    this.toolPanels = document.querySelectorAll(".tool-panel");
    this.setupEventListeners();
  }
}
