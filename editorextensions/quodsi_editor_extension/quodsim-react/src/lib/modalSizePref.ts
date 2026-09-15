/**
 * Per-user window-size preference for the embedded Studio modals, stored in
 * localStorage and read at the moment a modal opens (sent with OPEN_*_MODAL).
 * The helpers live in @quodsi/shared (preferences/modalSize.ts), beside the
 * Settings screen's Window size section that edits them; this module keeps the
 * panel's import path.
 */
export { getModalSizePref, setModalSizePref } from '@quodsi/shared';
