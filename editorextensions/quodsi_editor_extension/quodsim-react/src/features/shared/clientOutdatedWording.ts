// LucidChart's wording for the out-of-date notice (spec 2026-10-21
// quodsi-version, Part C). Applied once at startup (index.tsx), so every notice
// this app mounts -- including the one inside the shared Studies surface --
// says to reload LucidChart, not the page.
import { setClientOutdatedMessage } from "quodsi_studio/platforms/shared";

export const LUCID_CLIENT_OUTDATED_MESSAGE =
  "Quodsi has been updated. Reload LucidChart to get the latest version.";

export function applyLucidClientOutdatedWording(): void {
  setClientOutdatedMessage(LUCID_CLIENT_OUTDATED_MESSAGE);
}
