import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // Node by default (the scoring library is pure); component tests opt into
    // jsdom with a `@vitest-environment jsdom` docblock.
    environment: 'node',
  },
})
