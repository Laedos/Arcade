import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: { reporter: ['text', 'lcov'], include: ['src/**/*.ts'], exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/render.ts'] },
  },
})
