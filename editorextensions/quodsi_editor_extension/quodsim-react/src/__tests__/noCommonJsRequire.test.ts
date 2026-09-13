// Lucid test mode serves this panel from the Vite dev server as native ES
// modules, where `require` does not exist. A bare `require(...)` still works
// in the production bundle (rolldown rewrites it) and under Vitest, so only
// the running panel fails: "Go to Model Editor" threw ReferenceError before
// selecting the model (2026-09-13 smoke). Panel source must use imports.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return name === '__tests__' ? [] : sourceFiles(path)
    }
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('panel source', () => {
  it('never calls CommonJS require', () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /(^|[^.\w])require\s*\(/.test(line) && !/^\s*(\/\/|\*)/.test(line))
        .map(({ i }) => `${relative(SRC, file)}:${i + 1}`),
    )
    expect(offenders).toEqual([])
  })
})
