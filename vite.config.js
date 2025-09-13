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
        globPatterns: [
          'index.html',
          'favicon.png',
          '**/*.js',
          '**/*.css',
        ],
      },
    }),
  ],
  optimizeDeps: {
    include: ['isomorphic-git', '@isomorphic-git/lightning-fs'],
  },
});
