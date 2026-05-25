import { useAuth } from "../../messaging/MessageContext";

export interface OpenInStudio {
  /** True when the extension provided a Studio base URL for this environment. */
  available: boolean;
  /** Open a Studio path (e.g. "/animation/<scenarioId>") in a new browser tab. */
  open: (path: string) => void;
}

/**
 * Reusable "Open in Studio" primitive for the Lucid panel. The extension
 * broadcasts the env-specific Studio origin as `auth.config.studioBaseUrl`
 * (see authHandler.STUDIO_URL_BY_PACKAGE_ID); this hook turns it into a
 * new-tab launcher. Mirrors AccountStrip's existing window.open pattern.
 */
export function useOpenInStudio(): OpenInStudio {
  const auth = useAuth();
  const base = auth.config?.studioBaseUrl;

  const open = (path: string) => {
    if (!base) return;
    const url = `${base.replace(/\/$/, "")}${path}`;
    window.open(url, "_blank", "noopener");
  };

  return { available: Boolean(base), open };
}
