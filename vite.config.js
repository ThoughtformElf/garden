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
        // All JavaScript chunks should now be under the default 2MB limit.
        // This will cause the build to fail if a new asset exceeds that limit.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
      },
    }),
  ],
  // This section is for the dev server only and should be kept.
  optimizeDeps: {
    include: ['isomorphic-git', '@isomorphic-git/lightning-fs', 'jszip'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isolate large, stable dependencies into their own chunks.
          if (id.includes('isomorphic-git') || id.includes('@isomorphic-git/lightning-fs')) {
            return 'chunk-git';
          }
          if (id.includes('codemirror') || id.includes('@codemirror')) {
            return 'chunk-codemirror';
          }
          if (id.includes('gpt-tokenizer')) {
            return 'chunk-gpt-tokenizer';
          }
          if (id.includes('eruda')) {
            return 'chunk-eruda';
          }
          // Bundle the remaining smaller modules from node_modules into a single vendor chunk.
          if (id.includes('node_modules')) {
            return 'chunk-vendor';
          }
        },
      },
    },
  },
});
