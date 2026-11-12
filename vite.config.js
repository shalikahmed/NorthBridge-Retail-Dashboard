import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths let the app work under Catalyst's /app/ path.
  base: './',
  build: {
    outDir: 'client',
    emptyOutDir: true,
  },
})
