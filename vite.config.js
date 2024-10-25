import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

const viteManifestHackIssue846 = {
  // Workaround from https://github.com/crxjs/chrome-extension-tools/issues/846#issuecomment-1861880919.
  name: 'manifestHackIssue846',
  renderCrxManifest(_manifest, bundle) {
      bundle['manifest.json'] = bundle['.vite/manifest.json']
      bundle['manifest.json'].fileName = 'manifest.json'
      delete bundle['.vite/manifest.json']
  },
}

export default defineConfig({
  plugins: [viteManifestHackIssue846, crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        content: 'src/content.ts',
        popup: 'src/popup.html',
        options: 'src/options.html',
      },
    },
  },
});
