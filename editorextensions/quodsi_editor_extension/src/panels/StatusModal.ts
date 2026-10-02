import { EditorClient, Modal } from 'lucid-extension-sdk';
import { getApiBaseUrl } from '../core/apiBaseUrl';

/** Fixed, compact size: the status list is short and needs no size preference. */
const STATUS_MODAL_SIZE = { width: 560, height: 620 } as const;

/**
 * Status (ClickUp 86e3f949t): quodsi_studio's shared StatusPanel, compiled
 * into the packaged quodsim-react bundle (?view=status), shown over the Lucid
 * application instead of opening Studio's /status page in a browser tab.
 *
 * A plain SDK Modal, NOT a RoutingModal: the view never talks to the host. It
 * fetches the public, unauthenticated GET /status itself from the apiBaseUrl
 * on its URL (resolved the same way AdvisorConsultModal resolves it). An empty
 * apiBaseUrl (no API for this package, e.g. prod today) still opens: the view
 * shows a clear "not configured" message.
 *
 * TITLED, so Lucid's native title bar X (and Esc) close it with no code of
 * ours. Hand-encoded query string: the extension sandbox has no
 * URLSearchParams (see AdvisorConsultModal).
 */
export class StatusModal extends Modal {
  /** Released from frameClosed; see SimulationRunHandler.handleOpenStatusModal. */
  private readonly onClosed?: () => void;

  constructor(client: EditorClient, opts: { onClosed?: () => void } = {}) {
    const url = `quodsim-react/index.html?view=status&apiBaseUrl=${encodeURIComponent(getApiBaseUrl() ?? '')}`;
    super(client, { url, title: 'Quodsi status', ...STATUS_MODAL_SIZE });
    this.onClosed = opts.onClosed;
  }

  protected frameClosed(): void {
    super.frameClosed();
    this.onClosed?.();
  }
}
