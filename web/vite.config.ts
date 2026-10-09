import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server: reachable from the Windows browser (host: true), API proxied to the local FastAPI.
// VITE_POLL=1 switches the watcher to polling when inotify does not fire on the 9p mount (ARCHITECTURE §11).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8000' },
    watch: { usePolling: process.env.VITE_POLL === '1' },
  },
})
