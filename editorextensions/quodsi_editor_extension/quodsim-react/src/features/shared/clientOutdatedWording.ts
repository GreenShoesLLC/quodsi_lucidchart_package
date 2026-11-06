// LucidChart's wording for the out-of-date notice (spec 2026-10-21
// quodsi-version, Part C; reworded for Marketplace packages 2026-11-06). The
// text lives in @quodsi/lucid-shared so the extension's alert says the same.
// Applied once at startup (index.tsx), so every notice this app mounts --
// including the one inside the shared Studies surface -- uses it.
import { setClientOutdatedMessage } from "quodsi_studio/platforms/shared";
import { LUCID_CLIENT_OUTDATED_MESSAGE } from "@quodsi/lucid-shared";

export { LUCID_CLIENT_OUTDATED_MESSAGE };

export function applyLucidClientOutdatedWording(): void {
  setClientOutdatedMessage(LUCID_CLIENT_OUTDATED_MESSAGE);
}
