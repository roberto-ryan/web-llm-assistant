// Simple build script
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
  'icon.png'
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
const entryPoints = [
  'src/background.js',
  'src/content.js',
  'src/panel.js',
  'src/options.js'
];

console.log('\nBuilding JavaScript...');
build({
  entryPoints,
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  // watch: process.argv.includes('--watch'),
  logLevel: 'info'
}).then(() => {
  console.log('\n✅ Build complete! Load the dist/ folder in Chrome.');
}).catch(() => process.exit(1));