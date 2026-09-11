// editorextensions/quodsi_editor_extension/src/core/messaging/pageGuard.ts
//
// Page guard for panel writes (spec 2026-09-11, ClickUp 86e37z4mg).
//
// Every host write handler resolves its target page implicitly, fresh at write
// time, via viewport.getCurrentPage(). A panel view that still shows page A
// after the user switched to page B would therefore write page A's list over
// page B's. The extension now stamps the page id on what it sends the panel
// (model-root snapshots, referenceData), panel writes echo it back as
// basedOnPageId, and handlers call assertWritePage before writing.
//
// Writes from the embedded Studio frame are exempt for now: that realm gets
// its data from quodsi_api, not an extension snapshot (ClickUp 86e381h8g).

export const PAGE_GUARD_EXEMPT_SOURCE = 'studio-embed-iframe';

export const PAGE_GUARD_MISSING_MESSAGE =
    'This edit was not tied to a loaded page, so it was not saved.';

export const PAGE_GUARD_MISMATCH_MESSAGE =
    'The model page changed before this edit was saved; the view has been refreshed. Please make the change again.';

export type PageGuardReason = 'missing' | 'mismatch';

export type PageGuardResult =
    | { ok: true }
    | { ok: false; reason: PageGuardReason; message: string };

export function checkWritePage(
    source: string | undefined,
    basedOnPageId: string | undefined,
    currentPageId: string
): PageGuardResult {
    if (source === PAGE_GUARD_EXEMPT_SOURCE) return { ok: true };
    if (!basedOnPageId) {
        return { ok: false, reason: 'missing', message: PAGE_GUARD_MISSING_MESSAGE };
    }
    if (basedOnPageId !== currentPageId) {
        return { ok: false, reason: 'mismatch', message: PAGE_GUARD_MISMATCH_MESSAGE };
    }
    return { ok: true };
}

export class PageGuardError extends Error {
    readonly reason: PageGuardReason;

    constructor(reason: PageGuardReason, message: string) {
        super(message);
        this.name = 'PageGuardError';
        this.reason = reason;
        // Keep `instanceof` working regardless of the compile target.
        Object.setPrototypeOf(this, PageGuardError.prototype);
    }
}

/** Throws a PageGuardError when the write must be refused; returns otherwise. */
export function assertWritePage(
    source: string | undefined,
    basedOnPageId: string | undefined,
    currentPageId: string
): void {
    const result = checkWritePage(source, basedOnPageId, currentPageId);
    if (!result.ok) throw new PageGuardError(result.reason, result.message);
}

/** True for a refused write whose page id named a different page. */
export function isPageMismatch(error: unknown): boolean {
    return error instanceof PageGuardError && error.reason === 'mismatch';
}
