/**
 * Size options for the embedded Studio modal (Scenarios / Animation / Results).
 *
 * The Lucid SDK fixes a modal's size at construction; `fullscreen` maps to the
 * SDK's `fullScreen: true`, the others to fixed pixel dimensions. The user picks
 * one in the model-editor Preferences; it is persisted per-user in the React app
 * and sent along with the OPEN_*_MODAL messages so the extension can size the
 * modal. `xlarge` is the default when the user hasn't chosen.
 */
export type ModalSize = 'medium' | 'large' | 'xlarge' | 'fullscreen';

export const DEFAULT_MODAL_SIZE: ModalSize = 'xlarge';

/** Pixel dimensions for the fixed (non-fullscreen) sizes. */
export const MODAL_SIZE_DIMENSIONS: Record<
  Exclude<ModalSize, 'fullscreen'>,
  { width: number; height: number }
> = {
  medium: { width: 1000, height: 700 },
  large: { width: 1400, height: 900 },
  xlarge: { width: 1600, height: 1000 },
};

/** User-facing options for the Preferences size dropdown (in display order). */
export const MODAL_SIZE_OPTIONS: { value: ModalSize; label: string }[] = [
  { value: 'medium', label: 'Medium (1000×700)' },
  { value: 'large', label: 'Large (1400×900)' },
  { value: 'xlarge', label: 'Extra large (1600×1000)' },
  { value: 'fullscreen', label: 'Fullscreen' },
];
