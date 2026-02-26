import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = globalThis?.process?.env?.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': backendTarget,
      '/users': backendTarget,
      '/practice': backendTarget,
      '/assessment': backendTarget,
      '/dashboard': backendTarget,
      '/admin': backendTarget,
      '/face': backendTarget,
    },
  },
})
