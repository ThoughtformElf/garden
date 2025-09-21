import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/eruda/eruda.js',
          dest: 'eruda' // This will create `dist/eruda/eruda.js`
        }
      ]
    }),    
  ],
  optimizeDeps: {
    include: ['isomorphic-git', '@isomorphic-git/lightning-fs', 'jszip'],
  },
  build: {},
});