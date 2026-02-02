import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web-only Vite config for Netlify deployment
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true
  }
})
