import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
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
    // three.js / R3F / postprocessing live in the lazily imported Experience chunk (~290 kB gzip).
    chunkSizeWarningLimit: 1200,
  },
});
