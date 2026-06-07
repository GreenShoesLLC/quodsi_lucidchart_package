"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODAL_SIZE_OPTIONS = exports.MODAL_SIZE_DIMENSIONS = exports.DEFAULT_MODAL_SIZE = void 0;
exports.DEFAULT_MODAL_SIZE = 'xlarge';
/** Pixel dimensions for the fixed (non-fullscreen) sizes. */
exports.MODAL_SIZE_DIMENSIONS = {
    medium: { width: 1000, height: 700 },
    large: { width: 1400, height: 900 },
    xlarge: { width: 1600, height: 1000 },
};
/** User-facing options for the Preferences size dropdown (in display order). */
exports.MODAL_SIZE_OPTIONS = [
    { value: 'medium', label: 'Medium (1000×700)' },
    { value: 'large', label: 'Large (1400×900)' },
    { value: 'xlarge', label: 'Extra large (1600×1000)' },
    { value: 'fullscreen', label: 'Fullscreen' },
];
