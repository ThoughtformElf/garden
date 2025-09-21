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
  // This explicitly tells Vite to use the browser version of these packages
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'process': 'process/browser',
    },
  },
  // This ensures the polyfills are available during development
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        {
          name: 'node-globals-polyfill',
          setup(build) {
            build.onResolve({ filter: /^buffer/ }, args => ({
              path: require.resolve('buffer/'),
            })),
            build.onResolve({ filter: /^process/ }, args => ({
                path: require.resolve('process/browser'),
            }))
          },
        },
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
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