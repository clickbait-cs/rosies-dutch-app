import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `base` must match the GitHub repo name, because GitHub Pages serves the
// site from https://clickbait-cs.github.io/rosies-dutch-app/
export default defineConfig({
  base: '/rosies-dutch-app/',
  plugins: [react(), tailwindcss()],
  // Firebase makes the bundle about 1 MB; that's fine for this app
  build: { chunkSizeWarningLimit: 1200 },
})
