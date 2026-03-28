import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/ergast': {
        target: 'https://api.jolpi.ca',
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/api\/ergast/, '/ergast/f1'),
      },
    },
  },
})
