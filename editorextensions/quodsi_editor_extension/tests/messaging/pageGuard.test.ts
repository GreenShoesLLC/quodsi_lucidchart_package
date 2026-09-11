import {
  checkWritePage,
  assertWritePage,
  isPageMismatch,
  PageGuardError,
  PAGE_GUARD_MISSING_MESSAGE,
  PAGE_GUARD_MISMATCH_MESSAGE,
} from '../../src/core/messaging/pageGuard';

describe('checkWritePage', () => {
  it('lets the embedded Studio frame write without a page id (exempt for now)', () => {
    expect(checkWritePage('studio-embed-iframe', undefined, 'page-B')).toEqual({ ok: true });
  });

  it('lets the embedded Studio frame write even with a different page id', () => {
    expect(checkWritePage('studio-embed-iframe', 'page-A', 'page-B')).toEqual({ ok: true });
  });

  it.each([undefined, ''])('rejects a panel write with page id %p as missing', (pageId) => {
    expect(checkWritePage('model-iframe', pageId, 'page-B')).toEqual({
      ok: false,
      reason: 'missing',
      message: PAGE_GUARD_MISSING_MESSAGE,
    });
  });

  it('rejects a write based on another page as a mismatch', () => {
    expect(checkWritePage('pattern-iframe', 'page-A', 'page-B')).toEqual({
      ok: false,
      reason: 'mismatch',
      message: PAGE_GUARD_MISMATCH_MESSAGE,
    });
  });

  it('accepts a write based on the current page', () => {
    expect(checkWritePage('model-iframe', 'page-B', 'page-B')).toEqual({ ok: true });
  });

  it('treats an undefined source like any panel source', () => {
    expect(checkWritePage(undefined, undefined, 'page-B')).toMatchObject({ ok: false, reason: 'missing' });
  });
});

describe('assertWritePage / isPageMismatch', () => {
  it('throws a PageGuardError carrying the reason and message', () => {
    let caught: unknown;
    try {
      assertWritePage('model-iframe', 'page-A', 'page-B');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PageGuardError);
    expect((caught as PageGuardError).reason).toBe('mismatch');
    expect((caught as PageGuardError).message).toBe(PAGE_GUARD_MISMATCH_MESSAGE);
    expect(isPageMismatch(caught)).toBe(true);
  });

  it('does not throw for a matching page', () => {
    expect(() => assertWritePage('model-iframe', 'page-B', 'page-B')).not.toThrow();
  });

  it('isPageMismatch is false for a missing page id and for ordinary errors', () => {
    let missing: unknown;
    try {
      assertWritePage('model-iframe', undefined, 'page-B');
    } catch (err) {
      missing = err;
    }
    expect(isPageMismatch(missing)).toBe(false);
    expect(isPageMismatch(new Error('boom'))).toBe(false);
  });
});
