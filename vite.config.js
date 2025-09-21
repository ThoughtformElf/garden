import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // This removes the random hash from the filenames
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
        
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