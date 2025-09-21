import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
        // Increase the size limit to prevent PWA build errors
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    // This plugin will reliably copy eruda.js to the root of the dist folder
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/eruda/eruda.js',
          dest: '.' // This creates dist/eruda.js
        }
      ]
    })
  ],
  // This alias is the key to fixing the "buffer" error in all environments
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // This is necessary to prevent the PWA build error
        manualChunks(id) {
          if (id.includes('gpt-tokenizer')) return 'chunk-gpt-tokenizer';
          if (id.includes('codemirror')) return 'chunk-codemirror';
          if (id.includes('isomorphic-git')) return 'chunk-git';
          if (id.includes('node_modules')) return 'chunk-vendor';
        },
      },
    },
  },
});