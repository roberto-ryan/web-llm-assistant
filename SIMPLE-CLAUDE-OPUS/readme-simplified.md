# Lightweight AI Browser Assistant

An ultra-lightweight Chrome extension that provides AI assistance with support for both external APIs (OpenAI-compatible) and local WebLLM fallback.

## Features

- **External API Support**: Connect to any OpenAI-compatible API (OpenAI, LM Studio, Ollama, etc.)
- **WebLLM Fallback**: Built-in AI that runs entirely in your browser
- **Page Context**: Automatically includes current page information in conversations
- **Markdown Rendering**: Clean formatting for AI responses
- **Minimal UI**: No bloat, just functionality

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Configuration

1. Click the extension icon to open settings
2. Configure your preferred API:
   - **LM Studio**: `http://localhost:1234/v1/chat/completions`
   - **Ollama**: `http://localhost:11434/v1/chat/completions`
   - **OpenAI**: `https://api.openai.com/v1/chat/completions` (requires API key)

## File Structure

```
src/
├── manifest.json      # Extension manifest
├── background.js      # Service worker for WebLLM
├── content.js         # Page context extraction
├── panel.html         # Side panel UI
├── panel.js           # Main chat logic
├── options.html       # Settings page
└── options.js         # Settings logic
```

## Usage

1. Click the extension icon or use `Ctrl+Shift+W` (Cmd+Shift+W on Mac)
2. Type your message and press Enter or click Send
3. The AI will respond using your configured API or WebLLM fallback

## API Compatibility

Works with any OpenAI-compatible endpoint:
- Local: LM Studio, Ollama, llama.cpp server
- Cloud: OpenAI, Azure OpenAI, Together AI, etc.

## Minimal Dependencies

- `@mlc-ai/web-llm`: WebLLM for browser-based AI (fallback)
- `showdown`: Markdown to HTML conversion
- No UI frameworks, no complex build tools

## Development

Watch mode for development:
```bash
npm run watch
```

## Notes

- External API is primary, WebLLM loads only if API fails
- Settings stored in Chrome sync storage
- Supports custom API endpoints and authentication
- Page context sent automatically (current page title, URL, selected text)