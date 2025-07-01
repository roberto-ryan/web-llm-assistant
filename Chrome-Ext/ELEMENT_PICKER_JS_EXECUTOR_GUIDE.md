# Element Picker + JS Executor Integration

This integration allows you to use the element picker to add context when generating JavaScript code with the JS executor.

## Quick Start

1. **Pick an Element**: Click the 🎯 button and select any element on the page
2. **Reference in Code**: Use `@elementName` in your JavaScript prompts
3. **Execute**: Use `/x` commands to generate and run code with element context

## Available Commands

### JavaScript Execution
- `/x <prompt>` - Generate and execute JavaScript code
- `/x click @loginButton` - Generate code to click the stored login button
- `/x fill @searchBox with "hello world"` - Generate code to fill an input

### Quick Actions
- `/click @elementName` - Directly click a stored element
- `/fill @elementName with <text>` - Directly fill an input element

### Element Management
- `rename @element1 loginButton` - Give your elements meaningful names
- `/help` - Show all available commands and your stored elements

## Usage Examples

### 1. Basic Element Interaction
```
1. Pick a button element (saves as @element1)
2. Type: /x click @element1
3. The AI generates: document.querySelector('#submit-btn').click();
```

### 2. Form Filling
```
1. Pick input fields (saves as @element1, @element2, etc.)
2. Rename them: rename @element1 emailField
3. Type: /x fill @emailField with "user@example.com"
4. The AI generates code to fill the field and trigger events
```

### 3. Complex Automation
```
1. Pick multiple elements (form fields, buttons, etc.)
2. Type: /x fill out the login form with email "test@test.com" and password "secret123", then click submit
3. The AI uses context from your stored elements to generate the complete automation
```

### 4. Data Extraction
```
1. Pick elements containing data you want
2. Type: /x extract the text from @priceElement and @titleElement and show in console
3. The AI generates code to get the data from your specific elements
```

## How It Works

1. **Element Storage**: When you pick elements, they're stored with their selectors, position, text content, and styling info
2. **Context Injection**: When you reference `@elementName` in prompts, the full element data is added to the AI context
3. **Smart Code Generation**: The AI uses the element context to generate precise, working code
4. **Reliable Selectors**: Uses the best available selector (ID, class, or tag) for each element

## Pro Tips

- **Name Your Elements**: Use meaningful names like `@loginButton` instead of `@element1`
- **Reference Multiple Elements**: "Use @username, @password, and @loginButton to log in"
- **Get Suggestions**: Type `/help` to see suggested actions for your stored elements
- **Element Persistence**: Your elements are saved across browser sessions

## Element Context Information

When you reference an element, the AI gets access to:
- **Selector**: The CSS selector to find the element
- **Position**: Location and size on the page
- **Content**: Text content and HTML structure
- **Styling**: Key CSS properties
- **Type**: Input type, tag name, classes, etc.

This rich context allows the AI to generate much more accurate and reliable code than generic prompts.
