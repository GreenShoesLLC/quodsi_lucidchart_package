import { ModalSize, DEFAULT_MODAL_SIZE } from '@quodsi/lucid-shared';

/**
 * Per-user preference for the embedded Studio modal size (Scenarios / Animation
 * / Results). Stored in localStorage so it persists across documents in the same
 * browser — mirrors the embeddedResultsFlag / quodsi_devtools precedent. Read at
 * the moment a modal is opened and sent along with the OPEN_*_MODAL message.
 */
const KEY = 'quodsi_modal_size';
const VALID: ModalSize[] = ['medium', 'large', 'xlarge', 'fullscreen'];

export function getModalSizePref(): ModalSize {
  try {
    const v = localStorage.getItem(KEY) as ModalSize | null;
    return v && VALID.includes(v) ? v : DEFAULT_MODAL_SIZE;
  } catch {
    return DEFAULT_MODAL_SIZE;
  }
}

export function setModalSizePref(size: ModalSize): void {
  try {
    localStorage.setItem(KEY, size);
  } catch {
    /* ignore — sandbox/storage unavailable */
  }
}
