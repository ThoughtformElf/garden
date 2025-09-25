import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Add the manifest object here
      manifest: {
        name: 'Thoughtform Garden',
        short_name: 'thoughtform.garden',
        description: 'Web-based IDE for AI-assisted programming and personal knowledge management',
        theme_color: '#07443b',
        // Set the display mode to 'browser'
        display: 'browser',
        icons: [
          // Make sure you have your icons defined here
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    outDir: 'docs',
    rollupOptions: {
      output: {
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
