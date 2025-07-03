// Codeblock enhancer module for Showdown
export class CodeBlockEnhancer {
  constructor(options = {}) {
    this.options = {
      showCopyButton: true,
      showLanguageLabel: true,
      additionalButtons: [], // Array of {label, icon, callback}
      ...options
    };
    
    this.codeBlockId = 0;
  }

  // Create Showdown extension
  getShowdownExtension() {
    return {
      type: 'output',
      regex: /<pre><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/g,
      replace: (match, codeContent, offset, fullText) => {
        return this.enhanceCodeBlock(match, codeContent);
      }
    };
  }

  enhanceCodeBlock(originalBlock, codeContent) {
    const id = `codeblock-${this.codeBlockId++}`;
    
    // Extract language from the code tag class
    const langMatch = originalBlock.match(/class="([^"]*language-(\w+)[^"]*)"/);
    const language = langMatch ? langMatch[2] : '';
    const langClass = langMatch ? langMatch[1] : '';
    
    // Decode HTML entities
    const decodedCode = this.decodeHtml(codeContent);
    
    // Build the enhanced code block
    let html = `<div class="code-block-wrapper" id="${id}">`;
    
    // Header with language label and buttons
    if (this.options.showLanguageLabel || this.options.showCopyButton || this.options.additionalButtons.length > 0) {
      html += `<div class="code-block-header">`;
      
      if (this.options.showLanguageLabel && language) {
        html += `<span class="code-language">${language}</span>`;
      }
      
      html += `<div class="code-block-actions">`;
      
      if (this.options.showCopyButton) {
        html += `<button class="code-copy-btn" data-code-id="${id}" title="Copy code">
          <span class="copy-icon">📋</span>
          <span class="copy-text">Copy</span>
        </button>`;
      }
      
      // Additional custom buttons
      this.options.additionalButtons.forEach((btn, index) => {
        html += `<button class="code-custom-btn" data-code-id="${id}" data-action="${index}" title="${btn.label}">
          ${btn.icon ? `<span class="btn-icon">${btn.icon}</span>` : ''}
          <span class="btn-text">${btn.label}</span>
        </button>`;
      });
      
      html += `</div></div>`;
    }
    
    // The actual code block
    html += `<pre><code class="${langClass}" data-code-content="${this.escapeHtml(decodedCode)}">${codeContent}</code></pre>`;
    html += `</div>`;
    
    return html;
  }

  // Attach event listeners to the code blocks
  attachListeners(container) {
    // Copy button listeners
    container.querySelectorAll('.code-copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const codeId = e.currentTarget.getAttribute('data-code-id');
        const codeBlock = document.querySelector(`#${codeId} code`);
        const code = codeBlock.getAttribute('data-code-content');
        
        try {
          await navigator.clipboard.writeText(code);
          this.showCopyFeedback(e.currentTarget, true);
        } catch (err) {
          console.error('Failed to copy:', err);
          this.showCopyFeedback(e.currentTarget, false);
        }
      });
    });
    
    // Custom button listeners
    container.querySelectorAll('.code-custom-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const codeId = e.currentTarget.getAttribute('data-code-id');
        const actionIndex = parseInt(e.currentTarget.getAttribute('data-action'));
        const codeBlock = document.querySelector(`#${codeId} code`);
        const code = codeBlock.getAttribute('data-code-content');
        const language = codeBlock.className.match(/language-(\w+)/)?.[1] || '';
        
        const action = this.options.additionalButtons[actionIndex];
        if (action && action.callback) {
          action.callback(code, language, codeId);
        }
      });
    });
  }

  showCopyFeedback(button, success) {
    const originalText = button.querySelector('.copy-text').textContent;
    const textEl = button.querySelector('.copy-text');
    
    textEl.textContent = success ? '✓ Copied!' : '✗ Failed';
    button.classList.add(success ? 'copy-success' : 'copy-error');
    
    setTimeout(() => {
      textEl.textContent = originalText;
      button.classList.remove('copy-success', 'copy-error');
    }, 2000);
  }

  decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // CSS styles for the code blocks
  getStyles() {
    return `
      .code-block-wrapper {
        margin: 10px 0;
        border-radius: 8px;
        overflow: hidden;
        background: #1e1e1e;
        border: 1px solid #333;
      }
      
      .code-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #2a2a2a;
        border-bottom: 1px solid #333;
        min-height: 32px;
      }
      
      .code-language {
        font-size: 12px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .code-block-actions {
        display: flex;
        gap: 8px;
      }
      
      .code-copy-btn, .code-custom-btn {
        padding: 4px 8px;
        background: #3a4a5a;
        color: #e0e0e0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }
      
      .code-copy-btn:hover, .code-custom-btn:hover {
        background: #4a5a6a;
        transform: translateY(-1px);
      }
      
      .code-copy-btn:active, .code-custom-btn:active {
        transform: translateY(0);
      }
      
      .code-copy-btn.copy-success {
        background: #2a5a3a;
      }
      
      .code-copy-btn.copy-error {
        background: #5a2a2a;
      }
      
      .code-block-wrapper pre {
        margin: 0;
        padding: 12px;
        overflow-x: auto;
        background: #1e1e1e;
      }
      
      .code-block-wrapper code {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.5;
        color: #e0e0e0;
      }
      
      /* Hide icons on small buttons */
      @media (max-width: 400px) {
        .copy-icon, .btn-icon {
          display: none;
        }
      }
    `;
  }

  // Track which code blocks have been executed for undo functionality
  trackExecution(codeId, executionData) {
    if (!this.executedBlocks) {
      this.executedBlocks = new Map();
    }
    this.executedBlocks.set(codeId, executionData);
  }

  getExecutionData(codeId) {
    return this.executedBlocks?.get(codeId);
  }

  // Update button visibility based on execution state
  updateButtonVisibility(codeId, hasBeenExecuted) {
    const wrapper = document.getElementById(codeId);
    if (!wrapper) return;
    
    const runBtn = wrapper.querySelector('.code-run-btn');
    const undoBtn = wrapper.querySelector('.code-undo-btn');
    
    if (runBtn && undoBtn) {
      if (hasBeenExecuted) {
        runBtn.style.display = 'none';
        undoBtn.style.display = 'flex';
      } else {
        runBtn.style.display = 'flex';
        undoBtn.style.display = 'none';
      }
    }
  }
}

// Enhanced integration with toolbox and JS executor
export function createEnhancedCodeBlockSystem(jsExecutor, toolbox) {
  return new CodeBlockEnhancer({
    showCopyButton: true,
    showLanguageLabel: true,
    additionalButtons: [
      {
        label: 'Run',
        icon: '▶',
        callback: async (code, language, codeId) => {
          if (language === 'javascript' || language === 'js') {
            try {
              // Generate undo code before execution
              const undoCode = await jsExecutor.generateUndoCode(code);
              
              // Execute the code
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              const result = await chrome.tabs.sendMessage(tab.id, {
                action: 'executeCode',
                code: code
              });
              
              // Track execution for undo
              const codeEnhancer = this; // Reference to enhancer instance
              codeEnhancer.trackExecution(codeId, { undoCode, tabId: tab.id });
              
              // Update button visibility
              codeEnhancer.updateButtonVisibility(codeId, true);
              
              if (window.addMessage) {
                window.addMessage(`✅ Code executed successfully`, "system");
              }
            } catch (error) {
              if (window.addMessage) {
                window.addMessage(`❌ Error: ${error.message}`, "error");
              }
            }
          } else {
            if (window.addMessage) {
              window.addMessage(`ℹ️ Can only run JavaScript code`, "system");
            }
          }
        }
      },
      {
        label: 'Undo',
        icon: '↶',
        callback: async (code, language, codeId) => {
          const codeEnhancer = this;
          const execData = codeEnhancer.getExecutionData(codeId);
          
          if (execData && execData.undoCode) {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              await chrome.tabs.sendMessage(tab.id, {
                action: 'executeCode',
                code: execData.undoCode
              });
              
              // Clear execution data and update buttons
              codeEnhancer.trackExecution(codeId, null);
              codeEnhancer.updateButtonVisibility(codeId, false);
              
              if (window.addMessage) {
                window.addMessage(`↶ Changes undone successfully`, "system");
              }
            } catch (error) {
              if (window.addMessage) {
                window.addMessage(`❌ Undo failed: ${error.message}`, "error");
              }
            }
          }
        }
      },
      {
        label: 'Add to Toolbox',
        icon: '📌',
        callback: async (code, language, codeId) => {
          try {
            // Prompt for tool name
            const name = prompt('Name for this code snippet:', `Code from ${new Date().toLocaleDateString()}`);
            if (!name) return;
            
            // Add to toolbox
            const tool = await toolbox.addTool(code, language, name);
            
            if (window.addMessage) {
              window.addMessage(`📌 Added "${tool.name}" to toolbox`, "system");
            }
            
            // Optionally refresh the toolbox UI if it's open
            const toolboxContainer = document.getElementById('toolbox-list');
            if (toolboxContainer && window.toolboxUI) {
              window.toolboxUI.render(toolboxContainer);
            }
          } catch (error) {
            if (window.addMessage) {
              window.addMessage(`❌ Failed to add to toolbox: ${error.message}`, "error");
            }
          }
        }
      }
    ]
  });
}