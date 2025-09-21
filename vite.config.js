import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // No 'base' property is needed for your custom domain
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true, // Keep this for Buffer access
      },
      protocolImports: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,md}'],
        // Increase the size limit to prevent PWA build errors
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    // This reliably copies eruda.js into the build directory
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/eruda/eruda.js',
          dest: 'eruda' // Creates `dist/eruda/eruda.js`
        }
      ]
    })
  ],
  // This alias is the key to fixing the production 'buffer' error
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  // We can let Vite handle chunking to avoid dependency errors
  build: {},
});