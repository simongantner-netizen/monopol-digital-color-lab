import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves project sites from /<repo>/, so every asset URL needs
  // that prefix. Overridable via BASE_PATH for any other host.
  base: process.env.BASE_PATH ?? '/monopol-digital-color-lab/',
})
