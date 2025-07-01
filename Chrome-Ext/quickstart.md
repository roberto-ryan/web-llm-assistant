# Quick Start (2 minutes)

## 1. Setup
```bash
# Create project
mkdir lightweight-ai-assistant && cd lightweight-ai-assistant
mkdir src

# Create package.json and copy all files to src/
# Add any 128x128 PNG as src/icon.png

# Install and build
npm install
npm run build
```

## 2. Install in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder

## 3. Configure API
Right-click extension icon → Options:

**LM Studio**: `http://localhost:1234/v1/chat/completions`  
**Ollama**: `http://localhost:11434/v1/chat/completions`  
**OpenAI**: `https://api.openai.com/v1/chat/completions` (needs API key)

## 4. Use It!
Click extension icon → Type message → Enter

## That's it! 🎉

### Files Needed:
- `src/manifest.json`
- `src/background.js` 
- `src/content.js`
- `src/panel.html`
- `src/panel.js`
- `src/options.html`
- `src/options.js`
- `src/icon.png` (any 128x128 PNG)
- `package.json`
- `build.js`