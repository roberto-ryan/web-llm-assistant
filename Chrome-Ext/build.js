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
    format: 'esm',
    entryPoints: ['src/background.js'],
    outfile: 'dist/background.js',
    // Bundle WebLLM for background
  }),
  
  // Panel script - keep as ES module for external imports
  build({
    ...commonOptions,
    format: 'esm',
    entryPoints: ['src/panel.js'],
    outfile: 'dist/panel.js',
  }),
  
  // Content scripts - use IIFE format
  build({
    ...commonOptions,
    format: 'iife',
    entryPoints: ['src/content.js'],
    outfile: 'dist/content.js',
  }),
  
  // Options script - use IIFE format
  build({
    ...commonOptions,
    format: 'iife',
    entryPoints: ['src/options.js'],
    outfile: 'dist/options.js',
  }),
  
  // Element picker as standalone IIFE
  build({
    ...commonOptions,
    format: 'iife',
    entryPoints: ['src/elementPicker.js'],
    outfile: 'dist/elementPicker.js',
  }),
  
  // Autocomplete registry as standalone IIFE
  build({
    ...commonOptions,
    format: 'iife',
    entryPoints: ['src/autocomplete-registry.js'],
    outfile: 'dist/autocomplete-registry.js',
  }),
  
  // Simple autocomplete module as standalone IIFE
  build({
    ...commonOptions,
    format: 'iife',
    entryPoints: ['src/simple-autocomplete.js'],
    outfile: 'dist/simple-autocomplete.js',
  }),
  
  // New enhanced modules - build as ES modules
  build({
    ...commonOptions,
    format: 'esm',
    entryPoints: ['src/js-executor-extended.js'],
    outfile: 'dist/js-executor-extended.js',
  }),

  build({
    ...commonOptions,
    format: 'esm',
    entryPoints: ['src/codeblock-enhancer.js'],
    outfile: 'dist/codeblock-enhancer.js',
  }),

  build({
    ...commonOptions,
    format: 'esm',
    entryPoints: ['src/code-toolbox.js'],
    outfile: 'dist/code-toolbox.js',
  })
]).then(() => {
  console.log('\n✅ Build complete! Load the dist/ folder in Chrome.');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});