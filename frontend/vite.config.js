import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js
// Vite is the build tool & dev server for the React frontend.
// The proxy below forwards /api/* and /ws/* to FastAPI so we avoid CORS
// issues during development (both appear to be on port 5173).

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})