// editorextensions/quodsi_editor_extension/src/core/messaging/referenceCleanupOptions.ts
//
// A delete dialog's Seize/Release choice as it arrives on a write envelope
// (spec 2026-09-11 resource delete cleanup). Only exactly 'remove' removes
// steps; anything else -- absent (Advisor and embedded-Studio writes carry
// none) or malformed -- keeps them and lets validation flag them.
import type { SeizeReleaseDisposition } from '@quodsi/lucid-shared';

export function readReferenceCleanupOptions(data: unknown): { seizeRelease: SeizeReleaseDisposition } {
    const value = (data as { seizeRelease?: unknown } | null | undefined)?.seizeRelease;
    return { seizeRelease: value === 'remove' ? 'remove' : 'flag' };
}
