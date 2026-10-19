import {
  EXAMPLE_PAGE_STORAGE_KEY,
  adoptTourDocument,
  clearExamplePageId,
  readExamplePageId,
  readTourOwner,
  writeExamplePage,
} from '../examplePageStore'

describe('examplePageStore', () => {
  beforeEach(() => localStorage.clear())

  it('stores the owning document and example page per user', () => {
    expect(readTourOwner('a@x')).toBeNull()
    expect(readExamplePageId('a@x')).toBeNull()
    writeExamplePage('a@x', 'doc-a', 'pg-1')
    writeExamplePage('b@x', 'doc-b', 'pg-2')
    expect(readTourOwner('a@x')).toEqual({ documentId: 'doc-a', pageId: 'pg-1' })
    expect(readExamplePageId('b@x')).toBe('pg-2')
    expect(EXAMPLE_PAGE_STORAGE_KEY).toBe('quodsi.onboarding.lucid.examplePage.v2')
    expect(localStorage.getItem(EXAMPLE_PAGE_STORAGE_KEY)).toContain('pg-1')

    // Clearing the page keeps the owner.
    clearExamplePageId('a@x')
    expect(readExamplePageId('a@x')).toBeNull()
    expect(readTourOwner('a@x')).toEqual({ documentId: 'doc-a', pageId: null })
    expect(readExamplePageId('b@x')).toBe('pg-2')
  })

  it('adopting keeps the page id for the same document and drops it for another', () => {
    writeExamplePage('a@x', 'doc-a', 'pg-1')
    adoptTourDocument('a@x', 'doc-a')
    expect(readTourOwner('a@x')).toEqual({ documentId: 'doc-a', pageId: 'pg-1' })
    adoptTourDocument('a@x', 'doc-b')
    expect(readTourOwner('a@x')).toEqual({ documentId: 'doc-b', pageId: null })
  })

  it('ignores a v1 blob (page id with no owning document)', () => {
    localStorage.setItem('quodsi.onboarding.lucid.examplePage.v1', JSON.stringify({ version: 1, users: { 'a@x': 'pg-1' } }))
    expect(readTourOwner('a@x')).toBeNull()
  })

  it('degrades to null on corrupt or hostile storage and never throws', () => {
    localStorage.setItem(EXAMPLE_PAGE_STORAGE_KEY, '{not json')
    expect(readTourOwner('a@x')).toBeNull()
    localStorage.setItem(EXAMPLE_PAGE_STORAGE_KEY, JSON.stringify({ version: 2, users: { 'a@x': 7, 'b@x': { pageId: 'p' } } }))
    expect(readTourOwner('a@x')).toBeNull()
    expect(readTourOwner('b@x')).toBeNull()
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const spySet = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readExamplePageId('a@x')).toBeNull()
    expect(() => writeExamplePage('a@x', 'doc', 'pg')).not.toThrow()
    expect(() => adoptTourDocument('a@x', 'doc')).not.toThrow()
    spy.mockRestore()
    spySet.mockRestore()
  })
})
