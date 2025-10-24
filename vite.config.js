import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Thoughtform Garden',
        short_name: 'thoughtform.garden',
        description: 'Web-based IDE for AI-assisted programming and personal knowledge management',
        theme_color: '#07443b',
        display: 'browser',
        icons: [
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
        // Add a runtime caching rule to always try the network first for the main page.
        // This ensures the browser gets the newest version of the app shell,
        // which will in turn trigger the service worker `autoUpdate`.
        runtimeCaching: [
          {
            // Apply this rule to navigation requests (loading the page itself).
            urlPattern: ({ request }) => request.mode === 'navigate',
            // Try the network first. If it fails, serve the cached version.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              // Give the network 3 seconds to respond before falling back to cache.
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
              },
            },
          },
        ]
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