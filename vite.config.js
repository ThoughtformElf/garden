import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
  ],
  resolve: {
    // This is the key to fixing the "buffer" error in all environments
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
          if (id.includes('eruda')) return 'chunk-eruda';
          if (id.includes('node_modules')) return 'chunk-vendor';
        },
      },
    },
  },
});