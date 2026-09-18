import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// One multi-page build: the menu at the root and each game in its own folder, served at
// /<game>/. Adding a game means a new folder, an entry here, and a card in index.html.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        menu: resolve(import.meta.dirname, 'index.html'),
        slingwell: resolve(import.meta.dirname, 'slingwell/index.html'),
        stacker: resolve(import.meta.dirname, 'stacker/index.html'),
        snake: resolve(import.meta.dirname, 'snake/index.html'),
        'lights-out': resolve(import.meta.dirname, 'lights-out/index.html'),
        'four-in-a-row': resolve(import.meta.dirname, 'four-in-a-row/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '*/src/main.ts', '*/src/render.ts', 'server/src/index.ts', 'server/src/doodle/DoodleRoom.ts', '*/src/protocol.ts', 'doodle-telephone/src/pad.ts'],
    },
  },
})
