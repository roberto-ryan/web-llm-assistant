// src/code-toolbox.js
var CodeToolbox = class {
  constructor() {
    this.tools = /* @__PURE__ */ new Map();
    this.executionHistory = /* @__PURE__ */ new Map();
    this.autoRunRules = /* @__PURE__ */ new Map();
    this.loadFromStorage();
    this.setupAutoExecution();
  }
  async loadFromStorage() {
    const data = await chrome.storage.local.get(["codeTools", "autoRunRules"]);
    if (data.codeTools) {
      this.tools = new Map(Object.entries(data.codeTools));
    }
    if (data.autoRunRules) {
      this.autoRunRules = new Map(
        Object.entries(data.autoRunRules).map(([id, rule]) => [
          id,
          { ...rule, sites: new Set(rule.sites || []) }
        ])
      );
    }
  }
  async saveToStorage() {
    const toolsObj = Object.fromEntries(this.tools);
    const rulesObj = Object.fromEntries(
      Array.from(this.autoRunRules.entries()).map(([id, rule]) => [
        id,
        { ...rule, sites: Array.from(rule.sites) }
      ])
    );
    await chrome.storage.local.set({
      codeTools: toolsObj,
      autoRunRules: rulesObj
    });
  }
  generateId() {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  async addTool(code, language = "javascript", name = null) {
    const id = this.generateId();
    const tool = {
      id,
      name: name || `Code Snippet ${this.tools.size + 1}`,
      code,
      language,
      createdAt: Date.now(),
      lastRun: null,
      runCount: 0
    };
    this.tools.set(id, tool);
    await this.saveToStorage();
    return tool;
  }
  async updateTool(id, updates) {
    const tool = this.tools.get(id);
    if (!tool)
      throw new Error(`Tool ${id} not found`);
    Object.assign(tool, updates);
    await this.saveToStorage();
    return tool;
  }
  async deleteTool(id) {
    this.tools.delete(id);
    this.autoRunRules.delete(id);
    await this.saveToStorage();
  }
  getTool(id) {
    return this.tools.get(id);
  }
  getAllTools() {
    return Array.from(this.tools.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
  // Auto-execution management
  async setAutoRun(toolId, enabled, scope = "site") {
    if (!this.tools.has(toolId))
      return;
    if (!enabled) {
      this.autoRunRules.delete(toolId);
    } else {
      const rule = this.autoRunRules.get(toolId) || { allPages: false, sites: /* @__PURE__ */ new Set() };
      if (scope === "all") {
        rule.allPages = true;
      } else if (scope === "site") {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
          const url = new URL(tab.url);
          rule.sites.add(url.hostname);
        }
      }
      this.autoRunRules.set(toolId, rule);
    }
    await this.saveToStorage();
  }
  getAutoRunInfo(toolId) {
    const rule = this.autoRunRules.get(toolId);
    if (!rule)
      return { enabled: false, allPages: false, sites: [] };
    return {
      enabled: true,
      allPages: rule.allPages,
      sites: Array.from(rule.sites)
    };
  }
  // Setup auto-execution listener
  setupAutoExecution() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.executeAutoRunTools(tab);
      }
    });
  }
  async executeAutoRunTools(tab) {
    if (!tab.url || tab.url.startsWith("chrome://"))
      return;
    const url = new URL(tab.url);
    const hostname = url.hostname;
    for (const [toolId, rule] of this.autoRunRules.entries()) {
      const tool = this.tools.get(toolId);
      if (!tool)
        continue;
      const shouldRun = rule.allPages || rule.sites.has(hostname);
      if (shouldRun) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: "executeCode",
            code: tool.code,
            toolId,
            isAutoRun: true
          });
        }, 1e3);
      }
    }
  }
  // Execution history for undo functionality
  recordExecution(toolId, tabId, undoCode = null) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.executionHistory.set(executionId, {
      toolId,
      tabId,
      undoCode,
      timestamp: Date.now()
    });
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.lastRun = Date.now();
      tool.runCount = (tool.runCount || 0) + 1;
      this.saveToStorage();
    }
    if (this.executionHistory.size > 50) {
      const sorted = Array.from(this.executionHistory.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < sorted.length - 50; i++) {
        this.executionHistory.delete(sorted[i][0]);
      }
    }
    return executionId;
  }
  getRecentExecutions(toolId = null) {
    const executions = Array.from(this.executionHistory.entries()).filter(([_, data]) => !toolId || data.toolId === toolId).sort((a, b) => b[1].timestamp - a[1].timestamp);
    return executions.map(([id, data]) => ({ id, ...data }));
  }
  getUndoCode(executionId) {
    const execution = this.executionHistory.get(executionId);
    return execution ? execution.undoCode : null;
  }
};
var ToolboxUI = class {
  constructor(toolbox, jsExecutor) {
    this.toolbox = toolbox;
    this.jsExecutor = jsExecutor;
    this.container = null;
  }
  render(container) {
    this.container = container;
    const tools = this.toolbox.getAllTools();
    if (tools.length === 0) {
      container.innerHTML = '<p style="color: #999; font-style: italic;">No saved code snippets</p>';
      return;
    }
    container.innerHTML = tools.map((tool) => this.renderTool(tool)).join("");
    this.attachListeners();
  }
  renderTool(tool) {
    const autoRunInfo = this.toolbox.getAutoRunInfo(tool.id);
    const recentExec = this.toolbox.getRecentExecutions(tool.id)[0];
    return `
      <div class="toolbox-item" data-tool-id="${tool.id}">
        <div class="tool-header">
          <h4 class="tool-name">${this.escapeHtml(tool.name)}</h4>
          <div class="tool-meta">
            ${tool.runCount > 0 ? `<span class="run-count">Run ${tool.runCount}x</span>` : ""}
            ${autoRunInfo.enabled ? '<span class="auto-run-badge">Auto</span>' : ""}
          </div>
        </div>
        
        <div class="tool-code-preview">
          <code>${this.escapeHtml(tool.code.split("\n")[0].substring(0, 50))}...</code>
        </div>
        
        <div class="tool-actions">
          <button class="tool-btn tool-run" title="Run code">
            <span class="btn-icon">\u25B6</span>
            <span class="btn-text">Run</span>
          </button>
          
          ${recentExec && recentExec.undoCode ? `
            <button class="tool-btn tool-undo" data-exec-id="${recentExec.id}" title="Undo last run">
              <span class="btn-icon">\u21B6</span>
              <span class="btn-text">Undo</span>
            </button>
          ` : ""}
          
          <button class="tool-btn tool-edit" title="Edit code">
            <span class="btn-icon">\u270F\uFE0F</span>
            <span class="btn-text">Edit</span>
          </button>
          
          <div class="tool-auto-menu">
            <button class="tool-btn tool-auto-toggle" title="Auto-run settings">
              <span class="btn-icon">\u26A1</span>
              <span class="btn-text">Auto</span>
            </button>
            <div class="auto-options" style="display: none;">
              <button class="auto-option" data-scope="site">Auto-run on this site</button>
              <button class="auto-option" data-scope="all">Auto-run on all pages</button>
              <button class="auto-option" data-scope="disable">Disable auto-run</button>
            </div>
          </div>
          
          <button class="tool-btn tool-delete" title="Delete tool">
            <span class="btn-icon">\u{1F5D1}\uFE0F</span>
          </button>
        </div>
      </div>
    `;
  }
  attachListeners() {
    if (!this.container)
      return;
    this.container.querySelectorAll(".tool-run").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const toolId = e.target.closest(".toolbox-item").dataset.toolId;
        await this.runTool(toolId);
      });
    });
    this.container.querySelectorAll(".tool-undo").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const execId = e.target.closest(".tool-undo").dataset.execId;
        await this.undoExecution(execId);
      });
    });
    this.container.querySelectorAll(".tool-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const toolId = e.target.closest(".toolbox-item").dataset.toolId;
        this.editTool(toolId);
      });
    });
    this.container.querySelectorAll(".tool-auto-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const menu = e.target.closest(".tool-auto-menu").querySelector(".auto-options");
        menu.style.display = menu.style.display === "none" ? "block" : "none";
      });
    });
    this.container.querySelectorAll(".auto-option").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const toolId = e.target.closest(".toolbox-item").dataset.toolId;
        const scope = e.target.dataset.scope;
        if (scope === "disable") {
          await this.toolbox.setAutoRun(toolId, false);
        } else {
          await this.toolbox.setAutoRun(toolId, true, scope);
        }
        e.target.closest(".auto-options").style.display = "none";
        this.render(this.container);
      });
    });
    this.container.querySelectorAll(".tool-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const toolId = e.target.closest(".toolbox-item").dataset.toolId;
        const tool = this.toolbox.getTool(toolId);
        if (confirm(`Delete "${tool.name}"?`)) {
          await this.toolbox.deleteTool(toolId);
          this.render(this.container);
        }
      });
    });
  }
  async runTool(toolId) {
    const tool = this.toolbox.getTool(toolId);
    if (!tool)
      return;
    try {
      const undoCode = await this.jsExecutor.generateUndoCode(tool.code);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: "executeCode",
        code: tool.code
      });
      const execId = this.toolbox.recordExecution(toolId, tab.id, undoCode);
      if (window.addMessage) {
        window.addMessage(`\u2705 Executed "${tool.name}"`, "system");
      }
      this.render(this.container);
    } catch (error) {
      if (window.addMessage) {
        window.addMessage(`\u274C Error: ${error.message}`, "error");
      }
    }
  }
  async undoExecution(executionId) {
    const undoCode = this.toolbox.getUndoCode(executionId);
    if (!undoCode)
      return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: "executeCode",
        code: undoCode
      });
      if (window.addMessage) {
        window.addMessage(`\u21B6 Undone successfully`, "system");
      }
    } catch (error) {
      if (window.addMessage) {
        window.addMessage(`\u274C Undo failed: ${error.message}`, "error");
      }
    }
  }
  editTool(toolId) {
    const tool = this.toolbox.getTool(toolId);
    if (!tool)
      return;
    const modal = document.createElement("div");
    modal.className = "tool-edit-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Edit Tool</h3>
        <input type="text" class="tool-name-input" value="${this.escapeHtml(tool.name)}" placeholder="Tool name">
        <textarea class="tool-code-input" placeholder="JavaScript code...">${this.escapeHtml(tool.code)}</textarea>
        <div class="modal-actions">
          <button class="save-btn">Save</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".save-btn").addEventListener("click", async () => {
      const name = modal.querySelector(".tool-name-input").value;
      const code = modal.querySelector(".tool-code-input").value;
      await this.toolbox.updateTool(toolId, { name, code });
      document.body.removeChild(modal);
      this.render(this.container);
    });
    modal.querySelector(".cancel-btn").addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
};
var toolboxStyles = `
  .toolbox-item {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .tool-name {
    margin: 0;
    font-size: 14px;
    color: #e0e0e0;
  }
  
  .tool-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
  }
  
  .run-count {
    color: #999;
  }
  
  .auto-run-badge {
    background: #4a5a3a;
    color: #9f9;
    padding: 2px 6px;
    border-radius: 3px;
  }
  
  .tool-code-preview {
    background: #1a1a1a;
    padding: 6px 10px;
    border-radius: 4px;
    margin-bottom: 10px;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  
  .tool-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .tool-btn {
    padding: 4px 8px;
    background: #3a4a5a;
    color: #e0e0e0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: all 0.2s ease;
  }
  
  .tool-btn:hover {
    background: #4a5a6a;
    transform: translateY(-1px);
  }
  
  .tool-run { background: #3a5a4a; }
  .tool-run:hover { background: #4a6a5a; }
  
  .tool-undo { background: #5a4a3a; }
  .tool-undo:hover { background: #6a5a4a; }
  
  .tool-delete { background: #5a3a3a; }
  .tool-delete:hover { background: #6a4a4a; }
  
  .tool-auto-menu {
    position: relative;
  }
  
  .auto-options {
    position: absolute;
    bottom: 100%;
    left: 0;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px;
    margin-bottom: 4px;
    min-width: 150px;
    z-index: 10;
  }
  
  .auto-option {
    display: block;
    width: 100%;
    padding: 6px 8px;
    background: none;
    color: #e0e0e0;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
  }
  
  .auto-option:hover {
    background: #3a3a3a;
  }
  
  /* Edit modal styles */
  .tool-edit-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: #2a2a2a;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
  }
  
  .modal-content h3 {
    margin: 0 0 15px 0;
    color: #e0e0e0;
  }
  
  .tool-name-input, .tool-code-input {
    width: 100%;
    padding: 8px;
    background: #1a1a1a;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    margin-bottom: 10px;
  }
  
  .tool-code-input {
    min-height: 200px;
    font-family: monospace;
    font-size: 13px;
  }
  
  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  
  .save-btn, .cancel-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .save-btn {
    background: #4a5a6a;
    color: #e0e0e0;
  }
  
  .cancel-btn {
    background: #3a3a3a;
    color: #e0e0e0;
  }
`;
export {
  CodeToolbox,
  ToolboxUI,
  toolboxStyles
};
