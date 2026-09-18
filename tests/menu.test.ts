import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import config from '../vite.config'

const root = resolve(import.meta.dirname, '..')
const menuHtml = readFileSync(resolve(root, 'index.html'), 'utf8')
const cardLinks = [...menuHtml.matchAll(/class="card" href="\.\/([^/"]+)\/"/g)].map((m) => m[1])
const buildInputs = Object.keys(config.build?.rollupOptions?.input ?? {}).filter((name) => name !== 'menu')

describe('menu', () => {
  it('lists at least one game', () => {
    expect(cardLinks.length).toBeGreaterThan(0)
  })

  it('has a card for exactly the games the build includes', () => {
    expect([...cardLinks].sort()).toEqual([...buildInputs].sort())
  })

  it('links only to game folders that have a page', () => {
    for (const game of cardLinks) expect(existsSync(resolve(root, game, 'index.html'))).toBe(true)
  })

  it('gives every game page a way back to the menu', () => {
    for (const game of cardLinks) expect(readFileSync(resolve(root, game, 'index.html'), 'utf8')).toContain('href="/"')
  })
})
