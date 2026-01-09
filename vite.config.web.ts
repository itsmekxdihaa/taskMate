import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web-only Vite config for development
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
