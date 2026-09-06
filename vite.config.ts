import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repo from /Practicum-Dashboard/, so built asset
  // URLs need that prefix. Local dev and the standalone build stay at root.
  base: process.env.GITHUB_PAGES === 'true' ? '/Practicum-Dashboard/' : '/',
  plugins: [react(), tailwindcss()],
})
