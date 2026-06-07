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
export declare const DEFAULT_MODAL_SIZE: ModalSize;
/** Pixel dimensions for the fixed (non-fullscreen) sizes. */
export declare const MODAL_SIZE_DIMENSIONS: Record<Exclude<ModalSize, 'fullscreen'>, {
    width: number;
    height: number;
}>;
/** User-facing options for the Preferences size dropdown (in display order). */
export declare const MODAL_SIZE_OPTIONS: {
    value: ModalSize;
    label: string;
}[];
//# sourceMappingURL=modalSize.d.ts.map