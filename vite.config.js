import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { nodePolyfills } from 'vite-plugin-node-polyfills';


export default defineConfig({
  plugins: [
    nodePolyfills({
        globals: {
          Buffer: true,
        },
        protocolImports: true,
      }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
        // Increase the file size limit to 5MB to handle the largest chunk
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/eruda/eruda.js',
          dest: '.' 
        }
      ]
    })
  ],
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  // Re-introduce manualChunks to split large libraries
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('gpt-tokenizer')) {
            return 'chunk-gpt-tokenizer';
          }
          if (id.includes('codemirror')) {
            return 'chunk-codemirror';
          }
          if (id.includes('isomorphic-git')) {
            return 'chunk-git';
          }
          if (id.includes('node_modules')) {
            return 'chunk-vendor';
          }
        },
      },
    },
  },
});