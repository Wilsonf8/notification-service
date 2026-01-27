import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

/**
 * Vite configuration for LiveConnect Widget.
 * Builds a single IIFE bundle that can be embedded on customer websites.
 */
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LiveConnect',
      formats: ['iife'],
      fileName: () => 'liveconnect.js',
    },
    outDir: 'dist',
    emptyDirBeforeWrite: true,
    minify: 'terser',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          // Keep CSS inline by not generating separate files
          return assetInfo.name || 'assets/[name][extname]';
        },
      },
    },
  },
  define: {
    // Ensure production build for smaller bundle
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
