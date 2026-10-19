import { clearExamplePageId, readExamplePageId, writeExamplePageId } from '../examplePageStore'

describe('examplePageStore', () => {
  beforeEach(() => localStorage.clear())

  it('stores the example page id per user', () => {
    expect(readExamplePageId('a@x')).toBeNull()
    writeExamplePageId('a@x', 'pg-1')
    writeExamplePageId('b@x', 'pg-2')
    expect(readExamplePageId('a@x')).toBe('pg-1')
    expect(readExamplePageId('b@x')).toBe('pg-2')
    expect(localStorage.getItem('quodsi.onboarding.lucid.examplePage.v1')).toContain('pg-1')
    clearExamplePageId('a@x')
    expect(readExamplePageId('a@x')).toBeNull()
    expect(readExamplePageId('b@x')).toBe('pg-2')
  })

  it('degrades to null on corrupt or hostile storage and never throws', () => {
    localStorage.setItem('quodsi.onboarding.lucid.examplePage.v1', '{not json')
    expect(readExamplePageId('a@x')).toBeNull()
    localStorage.setItem('quodsi.onboarding.lucid.examplePage.v1', JSON.stringify({ version: 1, users: { 'a@x': 7 } }))
    expect(readExamplePageId('a@x')).toBeNull()
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const spySet = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readExamplePageId('a@x')).toBeNull()
    expect(() => writeExamplePageId('a@x', 'pg')).not.toThrow()
    spy.mockRestore()
    spySet.mockRestore()
  })
})
