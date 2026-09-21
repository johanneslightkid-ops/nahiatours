import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * One config file, not two.
 *
 * There used to be a `vite.config.js` alongside this one. Vite resolves `.js`
 * before `.ts`, so the `.js` file was the real config and everything written
 * here was dead — including the build options. They are merged now, the `.js`
 * is gone, and the `allowedHosts` entry below is kept from it so the ngrok dev
 * tunnel still works.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    open: true,
    allowedHosts: ['skies-stalemate-handclasp.ngrok-free.dev'],
  },

  // `npm run serve` checks the production bundle, often in a container with no
  // browser to open — and preview inherits `server.open`, so without this it
  // dies on `xdg-open`.
  preview: {
    open: false,
  },

  build: {
    outDir: 'dist',
    // The site targets phones on hotel wifi; es2020 is supported by every
    // browser in the analytics and saves the transpiler a lot of output.
    target: 'es2020',
    rollupOptions: {
      output: {
        /**
         * React and nothing else.
         *
         * A broader vendor chunk is tempting and wrong here: grouping the
         * router, the markdown editor and the icon packs together pulls the
         * lazy routes' dependencies back into the entry, which is the exact
         * cost route splitting just removed. Keeping this to the three
         * packages every route needs lets Rollup put everything else where it
         * is actually used.
         */
        manualChunks: (id: string) =>
          /node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : undefined,
      },
    },
  },

  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});
