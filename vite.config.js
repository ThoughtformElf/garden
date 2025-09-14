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
        // Cache all assets in the dist folder for better offline support.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
      },
    }),
  ],
  optimizeDeps: {
    include: ['isomorphic-git', '@isomorphic-git/lightning-fs'],
  },
});
