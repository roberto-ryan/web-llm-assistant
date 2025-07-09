# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Lightweight AI Assistant" that provides an AI-powered browser assistant with both external API and WebLLM fallback capabilities. The extension features:

- **Side panel UI** for chat interactions
- **Element picker** for web page automation
- **JavaScript executor** with CSP-safe execution methods
- **WebLLM integration** for offline AI capabilities
- **Autocomplete system** for enhanced user experience

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build the extension (creates dist/ folder)
npm run build

# Build with watch mode for development
npm run watch
```

## Installation and Testing

1. Run `npm run build` to create the `dist/` folder
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the `dist/` folder
5. Configure API endpoint in extension options (right-click icon → Options)

## Architecture

### Core Components

- **Background Script** (`src/background.js`): Service worker with WebLLM handler and JavaScript execution methods
- **Side Panel** (`src/panel.js`): Main chat interface with markdown rendering and menu system
- **Content Script** (`src/content.js`): Page context extraction and element picker integration
- **JavaScript Executor** (`src/js-executor.js`): Dual execution system (MAIN world + DevTools API)
- **Element Picker** (`src/elementPicker.js`): Interactive element selection with persistent storage (uses css-selector-generator library)

### JavaScript Execution Methods

The extension supports two execution methods to handle different CSP restrictions:

1. **MAIN World Execution**: Default method using `chrome.scripting.executeScript`
2. **DevTools API**: Fallback for strict CSP sites using `chrome.debugger`

The system automatically detects CSP violations and falls back to DevTools execution when needed.

### Element Management System

- Elements are stored persistently across browser sessions
- Referenced using `@elementName` syntax in prompts
- Supports renaming: `rename @element1 loginButton`
- Provides rich context (selectors, position, content, styling)
- **Selector Generation**: Uses `css-selector-generator` library for optimized CSS selector generation with fallback to custom logic

### WebLLM Integration

- Uses `@mlc-ai/web-llm` for offline AI capabilities
- Fallback when external APIs are unavailable
- Handles model loading and inference in service worker

## Key Files Structure

```
src/
├── manifest.json          # Extension configuration
├── background.js          # Service worker with execution methods
├── panel.html/js          # Main chat interface
├── content.js             # Page context and element picker
├── js-executor.js         # Code generation and execution
├── elementPicker.js       # Element selection and management
├── autocomplete-registry.js # Command autocomplete system
├── menu-template.js       # Menu system for commands
└── options.html/js        # Settings interface
```

## Command System

The extension supports various slash commands:

- `/x <prompt>` - Generate and execute JavaScript code
- `/click @elementName` - Click stored element
- `/fill @elementName with <text>` - Fill input element
- `/help` - Show available commands and stored elements
- `rename @element1 newName` - Rename stored elements

## Development Notes

- Uses esbuild for bundling with different module formats (ESM for service worker, IIFE for content scripts)
- CSP-safe implementation avoids eval() in background context
- Element persistence uses Chrome storage API
- Supports both external API calls and local WebLLM inference
- Automatic fallback mechanisms for different execution environments
- **CSS Selector Generation**: Integrates `css-selector-generator` library for robust, optimized selector generation
- **DOM Utilities**: Uses `dom-helpers` for consistent element positioning, sizing, and visibility checks
- **Performance Optimization**: Implements `lodash-es` debounce/throttle for efficient event handling
- **Fallback Strategy**: Custom selector logic as fallback when library fails or produces non-unique selectors

## Testing Different Execution Methods

- Test on regular sites (should use MAIN world execution)
- Test on CSP-strict sites like GitHub, Office 365 (should fallback to DevTools)
- Use options page to force specific execution methods for testing

## Extension Permissions

Requires extensive permissions for full functionality:
- `storage`, `tabs`, `activeTab`, `sidePanel`, `scripting`
- `debugger` for DevTools API execution
- `<all_urls>` for universal page access