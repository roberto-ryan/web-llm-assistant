// Build script with proper WebLLM bundling
const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy static files
const staticFiles = [
  'manifest.json',
  'panel.html',
  'options.html',
  'icon.png',
  'elementPicker.css'
];

staticFiles.forEach(file => {
  const src = path.join('src', file);
  const dest = path.join('dist', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  } else if (file === 'icon.png') {
    console.log(`⚠ Warning: ${file} not found - extension will use default icon`);
  }
});

// Build JavaScript files
console.log('\nBuilding JavaScript...');

// Common build options
const commonOptions = {
  bundle: true,
  format: 'esm',
  // watch: process.argv.includes('--watch'),
  logLevel: 'info',
  platform: 'browser',
  target: ['chrome89'],
  loader: {
    '.wasm': 'file'
  }
};

// Build each file
Promise.all([
  // Background script - keep as ES module
  build({
    ...commonOptions,
    entryPoints: ['src/background.js'],
    outfile: 'dist/background.js',
    // Bundle WebLLM for background
  }),
  
  // Panel script - bundle everything
  build({
    ...commonOptions,
    entryPoints: ['src/panel.js'],
    outfile: 'dist/panel.js',
  }),
  
  // Content and options scripts
  build({
    ...commonOptions,
    entryPoints: ['src/content.js', 'src/options.js'],
    outdir: 'dist',
  }),
  
  // Element picker as standalone module
  build({
    ...commonOptions,
    entryPoints: ['src/elementPicker.js'],
    outfile: 'dist/elementPicker.js',
  })
]).then(() => {
  console.log('\n✅ Build complete! Load the dist/ folder in Chrome.');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});