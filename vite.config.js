import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Served under /gardenmarket/ on menyuqr.com (Traefik strips the prefix), like
// the coffee menu and driver-game-center apps. This must stay in sync with the
// Router `basename` in main.jsx and the Traefik StripPrefix rule — all three, or
// the app serves blank pages.
const BASE = '/gardenmarket/';

// The app talks to the backend directly via API_BASE (CORS-enabled), so the proxy
// is only a dev convenience.
export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:3100',
      '/uploads': 'http://localhost:3100',
      '/ws': { target: 'ws://localhost:3100', ws: true },
    },
  },
});
