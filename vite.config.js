import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
        // Increase the file size limit to handle the large gpt-tokenizer chunk
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    include: ['isomorphic-git', '@isomorphic-git/lightning-fs', 'jszip'],
  },
  build: {
    rollupOptions: {
      output: {
        // This refined chunking strategy solves the dependency loading error
        manualChunks(id) {
          if (id.includes('gpt-tokenizer')) {
            return 'chunk-gpt-tokenizer';
          }
          if (id.includes('codemirror')) {
            return 'chunk-codemirror';
          }
          // Let Vite bundle isomorphic-git with other vendors to preserve dependencies
          if (id.includes('node_modules')) {
            return 'chunk-vendor';
          }
        },
      },
    },
  },
});