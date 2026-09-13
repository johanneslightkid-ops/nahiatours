import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * React itself is pinned into its own chunk: it is the one dependency every
 * page needs, it changes far less often than the app code, and keeping it
 * separate means a deploy does not evict it from anyone's cache.
 *
 * Nothing else is grouped by hand. Forcing more of node_modules into named
 * chunks pulls lazily-loaded dependencies — the admin markdown editor, most
 * of all — back into the entry, and a group whose own dependencies land in a
 * different chunk can end up in a cycle that evaluates in the wrong order.
 * Rollup's own splitting handles the rest correctly.
 */
const vendorChunk = (id: string): string | undefined =>
  /node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    allowedHosts: ['skies-stalemate-handclasp.ngrok-free.dev'],
  },
  build: {
    outDir: 'dist',
    // Every browser that can run this app has supported these for years, and
    // not transpiling them keeps the bundle smaller and the parse cheaper.
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
});
