import { MODEL_FIELD_KEYS } from '@quodsi/lucid-shared';

/**
 * The page's own model settings: the Model field roster minus `id` (the host
 * owns identity). spec 2026-09-12 §2. Every path that writes them reads this
 * one list -- updateModelRoot, the Advisor/tour page builder, and Convert's
 * parked-record overlay -- so a new Model field is never dropped at one hop
 * (the two hand-kept copies had no `levers` until 2026-10-25).
 */
export const MODEL_SETTINGS_KEYS: readonly string[] = MODEL_FIELD_KEYS.filter(key => key !== 'id');
