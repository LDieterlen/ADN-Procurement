import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server: reachable from the Windows browser (host: true), API proxied to the local FastAPI.
// Port 5180, not Vite's default 5173, so FFE never collides with another project's dev server (JOURNAL D1.1).
// VITE_POLL=1 switches the watcher to polling when inotify does not fire on the 9p mount (ARCHITECTURE §11).
// VITE_PORT / FFE_API_PORT exist for the Playwright run only (5181 / 8001), so it never collides with a dev session.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: Number(process.env.VITE_PORT ?? 5180),
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${process.env.FFE_API_PORT ?? 8000}` },
    watch: { usePolling: process.env.VITE_POLL === '1' },
  },
})
