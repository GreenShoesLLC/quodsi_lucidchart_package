// quodsim-react/src/__tests__/panelBundle.test.ts
// Run: npm run build && PANEL_BUNDLE_PROBE=1 npx vitest run src/__tests__/panelBundle.test.ts
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BUILD = resolve(__dirname, '../../build')

describe.skipIf(process.env.PANEL_BUNDLE_PROBE !== '1')('quodsim-react build', () => {
  it('keeps the Studies surface out of the entry chunk', () => {
    const html = readFileSync(resolve(BUILD, 'index.html'), 'utf8')
    const tag = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]).find((t) => / type="module"/.test(t))
    if (!tag) throw new Error('no module script in build/index.html')
    const src = / src="([^"]+)"/.exec(tag)![1].replace(/^\.\//, '')
    const entry = readFileSync(resolve(BUILD, src), 'utf8')
    expect(entry).not.toContain('Tradeoff analysis')
    expect(entry).not.toContain('recharts-wrapper')
  })

  it('emits the surface in a lazy chunk', () => {
    const assets = readdirSync(resolve(BUILD, 'assets')).filter((f) => f.endsWith('.js'))
    expect(assets.some((f) => readFileSync(resolve(BUILD, 'assets', f), 'utf8').includes('Tradeoff analysis'))).toBe(true)
    expect(existsSync(BUILD)).toBe(true)
  })
})
