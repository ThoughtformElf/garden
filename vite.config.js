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
  optimizeDeps: {
    esbuildOptions: {
      // This is the key to making Buffer available in dev mode
      define: {
        global: 'globalThis',
      },
      // This enables using the 'buffer' package in the browser
      plugins: [
        {
          name: 'node-globals-polyfill',
          setup(build) {
            build.onResolve({ filter: /^buffer/ }, args => ({
              path: require.resolve('buffer/'),
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