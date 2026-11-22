import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { paletteCss } from './src/config/palette';

/**
 * Absolute path with an UPPER-CASE Windows drive letter. VS Code launches with `c:\…`, the rest of the
 * toolchain sees `C:\…`: modules reached through the alias got a second id (`c:/…`) and were bundled
 * twice — two copies of React in production ("Cannot read properties of null (reading 'useContext')").
 */
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url)).replace(/^[a-z](?=:)/, (d) => d.toUpperCase());

/** Injects src/config/palette.ts as --p-* CSS custom properties into <head> (first paint, no JS needed). */
function palette(): Plugin {
  return {
    name: 'yougoloun-palette',
    transformIndexHtml: () => [{ tag: 'style', attrs: { id: 'palette' }, children: paletteCss(), injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  plugins: [palette(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      '@content': fromRoot('./content'),
    },
  },
  // Pre-bundle everything up front (incl. the lazily imported 3D chunk) so the dev server never
  // re-optimises mid-session — that reload can leave two React copies on the page.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
    include: [
      'react',
      'react-dom/client',
      'react-router',
      'react-router/dom',
      'zustand',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'gsap',
      'gsap/ScrollTrigger',
      'gsap/SplitText',
      '@gsap/react',
      'lenis',
    ],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Explicit vendor chunks. Left alone, Rolldown folded React + three.js into the chunk of a shared
        // app module (palette.ts) with circular imports between chunks → in production React was read
        // before it initialised ("Cannot read properties of null (reading 'useContext')").
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\/](react|react-dom|scheduler|react-router|zustand|use-sync-external-store)[\/]/.test(id)) return 'react';
          if (/[\/](three|@react-three|postprocessing|n8ao|three-stdlib|three-mesh-bvh|maath|troika-|@monogrid|camera-controls|meshline|stats-gl|detect-gpu|hls\.js|suspend-react|its-fine|zustand)[\/]/.test(id)) return 'three';
          if (/[\/](gsap|@gsap|lenis)[\/]/.test(id)) return 'motion';
        },
      },
    },
  },
});
