import {
  EXAMPLE_PAGE_STORAGE_KEY,
  clearExamplePageId,
  readExamplePageId,
  readTourOwner,
  writeExamplePage,
} from '../examplePageStore'

// The store's logic and its other tests live in Studio's shared
// tourOwnership (spec 2026-11-18 §5.1); this pins Lucid's key and format.
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
})
