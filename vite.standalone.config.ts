import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// One-off config for producing a double-click-able standalone HTML file.
// Forces a classic (non-module) IIFE script bundle and a single CSS file so
// the build can be inlined into one self-contained index.html that opens
// correctly from file:// in real browsers — Chrome applies CORS-style
// restrictions to <script type="module"> on file:// pages that break the
// normal ES-module build output, even when the script is inlined.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-standalone',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'bundle.js',
        inlineDynamicImports: true,
      },
    },
  },
})
