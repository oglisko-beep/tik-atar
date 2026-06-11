import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Read VITE_* from .env files AND process.env (CI), then bake them in as plain
  // global constants (defining import.meta.env.* directly is unreliable — Vite owns that namespace).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const v = (k: string) => JSON.stringify(env[k] ?? process.env[k] ?? '')
  return {
    base: './',
    // Cast avoids the cosmetic Vite/Vitest duplicate-types Plugin mismatch.
    plugins: [react()] as never,
    define: {
      __AAD_CLIENT_ID__: v('VITE_AAD_CLIENT_ID'),
      __AAD_TENANT_ID__: v('VITE_AAD_TENANT_ID'),
      __SP_SITE__: v('VITE_SP_SITE'),
      __SP_LIBRARY__: v('VITE_SP_LIBRARY'),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.ts',
      css: false,
    },
  }
})
