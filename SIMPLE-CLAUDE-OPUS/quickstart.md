# Quick Start Guide

## 1. Quick Setup (5 minutes)

```bash
# Clone or create project
mkdir lightweight-ai-assistant
cd lightweight-ai-assistant

# Create src directory
mkdir src

# Copy all the files to src/
# Add a 128x128 icon.png to src/

# Install and build
npm install
npm run build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode" 
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

## 2. Configure API (1 minute)

Right-click extension icon → Options:

### For LM Studio:
- API Endpoint: `http://localhost:1234/v1/chat/completions`
- API Key: (leave empty)

### For Ollama:
- API Endpoint: `http://localhost:11434/v1/chat/completions`
- API Key: (leave empty)

### For OpenAI:
- API Endpoint: `https://api.openai.com/v1/chat/completions`
- API Key: `sk-your-api-key-here`

## 3. Use It!

- Click extension icon or press `Ctrl+Shift+W`
- Start chatting!

## Features Removed (for lightweight):
- ❌ Thinking/scratchpad UI
- ❌ Icons and animations  
- ❌ Complex tool system
- ❌ OAuth integrations
- ❌ Multiple CSS files
- ❌ TypeScript compilation
- ❌ Complex message history

## Features Kept:
- ✅ External API support (primary)
- ✅ WebLLM fallback
- ✅ Page context awareness
- ✅ Markdown rendering
- ✅ Simple, fast UI
- ✅ Settings persistence

## Troubleshooting

**API not connecting?**
- Check if your LM Studio/Ollama is running
- Verify the endpoint URL in settings
- Click "Test Connection" in options

**WebLLM slow to load?**
- First load downloads the model (one-time)
- Subsequent loads are much faster
- Smaller models (1B) load faster than larger ones

**Extension not working?**
- Check Chrome console for errors (F12)
- Ensure all files copied correctly
- Try reloading the extension