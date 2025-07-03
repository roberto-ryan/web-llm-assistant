// Extended JS Executor with undo code generation
import { JSExecutor } from './js-executor.js';

export class JSExecutorExtended extends JSExecutor {
  constructor(externalAI, webllmAI) {
    super(externalAI, webllmAI);
  }

  // Generate undo code for a given JavaScript code
  async generateUndoCode(code) {
    const prompt = `Given this JavaScript code that modifies a webpage:

\`\`\`javascript
${code}
\`\`\`

Generate JavaScript code that would undo/reverse these changes. The undo code should:
1. Restore any modified DOM elements to their previous state
2. Remove any added elements
3. Re-add any removed elements (if possible to track)
4. Restore any changed styles or attributes
5. Remove any added event listeners

If the changes cannot be fully reversed, generate code that does the best possible restoration.

Return ONLY the JavaScript undo code, no explanations.`;

    try {
      // Use AI to generate undo code
      const aiResponse = await this.callAI([
        { role: "system", content: "You are a JavaScript expert. Generate only code, no explanations." },
        { role: "user", content: prompt }
      ]);

      // Extract code from response (remove markdown if present)
      let undoCode = aiResponse.trim();
      if (undoCode.startsWith('```')) {
        undoCode = undoCode.replace(/```javascript\n?/, '').replace(/```\n?$/, '');
      }

      // Wrap in try-catch for safety
      return `try {
${undoCode}
} catch (error) {
  console.error('Undo operation failed:', error);
  throw error;
}`;

    } catch (error) {
      console.error('Failed to generate undo code:', error);
      // Return a basic undo that at least tries to reload
      return `// Could not generate specific undo code
console.warn('Undo generation failed, consider refreshing the page');`;
    }
  }

  // Enhanced execute with undo support
  async execute(prompt, context = {}) {
    const { code, result } = await super.execute(prompt, context);
    
    // If execution was successful, try to generate undo code
    if (result.success) {
      try {
        const undoCode = await this.generateUndoCode(code);
        result.undoCode = undoCode;
      } catch (error) {
        console.warn('Could not generate undo code:', error);
      }
    }
    
    return { code, result };
  }
}

// Helper function to track DOM changes for better undo generation
export class DOMChangeTracker {
  constructor() {
    this.changes = [];
    this.observer = null;
  }

  start() {
    this.changes = [];
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        this.recordMutation(mutation);
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
      subtree: true
    });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    return this.changes;
  }

  recordMutation(mutation) {
    const change = {
      type: mutation.type,
      target: this.getSelector(mutation.target),
      timestamp: Date.now()
    };

    switch (mutation.type) {
      case 'attributes':
        change.attribute = mutation.attributeName;
        change.oldValue = mutation.oldValue;
        change.newValue = mutation.target.getAttribute(mutation.attributeName);
        break;
      
      case 'childList':
        change.addedNodes = Array.from(mutation.addedNodes).map(node => ({
          type: node.nodeType,
          content: node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML
        }));
        change.removedNodes = Array.from(mutation.removedNodes).map(node => ({
          type: node.nodeType,
          content: node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML,
          previousSibling: mutation.previousSibling ? this.getSelector(mutation.previousSibling) : null,
          nextSibling: mutation.nextSibling ? this.getSelector(mutation.nextSibling) : null
        }));
        break;
      
      case 'characterData':
        change.oldValue = mutation.oldValue;
        change.newValue = mutation.target.textContent;
        break;
    }

    this.changes.push(change);
  }

  getSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    if (element.id) {
      return `#${element.id}`;
    }

    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      
      if (element.className) {
        selector += '.' + element.className.split(' ').join('.');
      }

      let sibling = element;
      let siblingIndex = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()) {
          siblingIndex++;
        }
      }
      
      if (siblingIndex > 1) {
        selector += `:nth-of-type(${siblingIndex})`;
      }

      path.unshift(selector);
      element = element.parentElement;
      
      if (path.length > 3) break; // Limit depth for performance
    }

    return path.join(' > ');
  }

  generateUndoCode() {
    const undoSteps = [];

    // Process changes in reverse order
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const change = this.changes[i];

      switch (change.type) {
        case 'attributes':
          if (change.oldValue !== null) {
            undoSteps.push(`
              document.querySelector('${change.target}')?.setAttribute('${change.attribute}', '${change.oldValue}');
            `);
          } else {
            undoSteps.push(`
              document.querySelector('${change.target}')?.removeAttribute('${change.attribute}');
            `);
          }
          break;

        case 'childList':
          // Remove added nodes
          change.addedNodes.forEach(node => {
            if (node.type === Node.ELEMENT_NODE) {
              undoSteps.push(`
                document.querySelector('${change.target}')?.querySelectorAll('*').forEach(el => {
                  if (el.outerHTML === \`${node.content}\`) el.remove();
                });
              `);
            }
          });

          // Re-add removed nodes (best effort)
          change.removedNodes.forEach(node => {
            if (node.type === Node.ELEMENT_NODE && change.target) {
              undoSteps.push(`
                const parent = document.querySelector('${change.target}');
                if (parent && !parent.innerHTML.includes(\`${node.content.substring(0, 50)}\`)) {
                  parent.insertAdjacentHTML('beforeend', \`${node.content}\`);
                }
              `);
            }
          });
          break;

        case 'characterData':
          undoSteps.push(`
            const textNode = document.evaluate('${change.target}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (textNode) textNode.textContent = '${change.oldValue}';
          `);
          break;
      }
    }

    return undoSteps.join('\n');
  }
}