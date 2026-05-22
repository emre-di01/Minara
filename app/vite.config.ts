import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5178,
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54341',
        rewrite: path => path.replace(/^\/supabase/, ''),
        changeOrigin: true,
        ws: true,
      },
      '/awqat': {
        target: 'http://127.0.0.1:8082',
        rewrite: path => path.replace(/^\/awqat/, ''),
        changeOrigin: true,
      },
    },
  },
})
