/**
 * Window sizes for the embedded Studio modals (Studies / Animation / Results,
 * the Advisor, the pattern/schedule editors, Settings).
 *
 * The Lucid SDK fixes a modal's size at construction; `fullscreen` maps to the
 * SDK's `fullScreen: true`, the others to fixed pixel dimensions. The user picks
 * one in Settings (Window size); the panel persists it and sends it with the
 * OPEN_*_MODAL messages so the extension can size the modal.
 *
 * The one declaration lives in @quodsi/shared (preferences/modalSize.ts),
 * shared with drawio and the Settings screen (spec 2026-09-15 section 3).
 */
export {
  DEFAULT_MODAL_SIZE,
  MODAL_SIZE_DIMENSIONS,
  MODAL_SIZE_OPTIONS,
} from '@quodsi/shared';
export type { ModalSize } from '@quodsi/shared';
