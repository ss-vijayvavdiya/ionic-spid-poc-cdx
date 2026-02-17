// Vite config for Ionic React + Cordova.
// The output directory is set to www so Cordova can serve the built web assets.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths are required for Cordova WebView.
  base: './',
  build: {
    outDir: 'www',
    emptyOutDir: true
  }
});
