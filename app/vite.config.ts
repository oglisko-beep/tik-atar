import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  // Cast avoids the cosmetic Vite/Vitest duplicate-types Plugin mismatch.
  plugins: [react()] as never,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    css: false,
  },
})
