// Example: How to use the Autocomplete Registry
// This shows how other modules can easily add their own autocomplete entries

// Wait for registry to be available
function waitForRegistry() {
    return new Promise((resolve) => {
        if (window.autocompleteRegistry) {
            resolve();
        } else {
            setTimeout(() => waitForRegistry().then(resolve), 100);
        }
    });
}

// Example module registration
async function registerExampleEntries() {
    await waitForRegistry();
    
    // Register some example entries
    registerAutocomplete([
        // Commands
        createAutocompleteEntry('cmd', 'refresh', 'Refresh the page', () => window.location.reload()),
        createAutocompleteEntry('cmd', 'scroll-top', 'Scroll to top', () => window.scrollTo(0, 0)),
        createAutocompleteEntry('cmd', 'fullscreen', 'Toggle fullscreen', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        }),
        
        // Variables
        createAutocompleteEntry('var', 'cookies', 'Number of cookies', () => document.cookie.split(';').length.toString()),
        createAutocompleteEntry('var', 'scripts', 'Number of scripts', () => document.scripts.length.toString()),
        createAutocompleteEntry('var', 'viewport', 'Viewport size', () => `${window.innerWidth}x${window.innerHeight}`),
        
        // Snippets
        createAutocompleteEntry('snippet', 'meeting', 'Meeting notes template', 
            `# Meeting Notes - ${new Date().toLocaleDateString()}

## Attendees
- [Name 1]
- [Name 2]

## Agenda
1. [Topic 1]
2. [Topic 2]

## Discussion
[Notes]

## Action Items
- [ ] [Action 1] - [Assignee]
- [ ] [Action 2] - [Assignee]

## Next Meeting
Date: [Date]
Time: [Time]`),
        
        createAutocompleteEntry('snippet', 'bug-template', 'Bug report template',
            `**Bug Description**
[Brief description of the issue]

**Steps to Reproduce**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**
[What should happen]

**Actual Behavior**
[What actually happens]

**Environment**
- Browser: [Browser name and version]
- OS: [Operating system]
- URL: ${window.location.href}

**Screenshots**
[Attach screenshots if applicable]`)
    ]);
    
    console.log('✓ Example autocomplete entries registered');
}

// Register entries when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerExampleEntries);
} else {
    registerExampleEntries();
}

// Example: Dynamic registration based on page content
function registerPageSpecificEntries() {
    waitForRegistry().then(() => {
        const entries = [];
        
        // Add entries based on page content
        if (document.querySelector('form')) {
            entries.push(createAutocompleteEntry('cmd', 'fill-form', 'Auto-fill form demo', () => {
                const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
                inputs.forEach((input, i) => {
                    if (input.type === 'email') {
                        input.value = 'test@example.com';
                    } else {
                        input.value = `Test ${i + 1}`;
                    }
                });
            }));
        }
        
        if (document.querySelector('table')) {
            entries.push(createAutocompleteEntry('var', 'table-rows', 'Number of table rows', 
                () => document.querySelectorAll('table tr').length.toString()));
        }
        
        if (document.querySelector('img')) {
            entries.push(createAutocompleteEntry('var', 'images', 'Number of images', 
                () => document.images.length.toString()));
        }
        
        if (entries.length > 0) {
            registerAutocomplete(entries);
            console.log(`✓ Registered ${entries.length} page-specific autocomplete entries`);
        }
    });
}

// Register page-specific entries
registerPageSpecificEntries();

// Example: Registry event listener
if (window.autocompleteRegistry) {
    window.autocompleteRegistry.addListener((action, entry, allEntries) => {
        console.log(`Registry ${action}:`, entry?.name, `(Total: ${allEntries.length})`);
    });
}

// Export utility functions for other modules
window.registerExampleEntries = registerExampleEntries;
window.registerPageSpecificEntries = registerPageSpecificEntries;

// Example usage in console:
/*
// Register a single command
registerAutocomplete({
    name: 'test',
    description: 'Test command',
    type: 'cmd',
    action: () => alert('Test!')
});

// Register multiple entries
registerAutocomplete([
    createAutocompleteEntry('var', 'random', 'Random number', () => Math.random().toFixed(2)),
    createAutocompleteEntry('cmd', 'log', 'Log to console', () => console.log('Hello from autocomplete!'))
]);

// Get all entries
console.table(getAutocompleteEntries());

// Search for entries
console.table(getAutocompleteEntries('test'));

// Export current registry
const exported = window.autocompleteRegistry.exportToJSON();
console.log(exported);
*/
