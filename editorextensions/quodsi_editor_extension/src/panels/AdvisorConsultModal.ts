import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';
import { getApiBaseUrl } from '../core/apiBaseUrl';

/**
 * Compiled Advisor consult (quodsim-react ?view=advisor). Chromeless: the view
 * draws its own header and Close. Uses the 'studio-embed' channel (token and
 * catalog relay). No server model id is needed — the consult carries the
 * document inline via STUDIO_CATALOG.document.
 *
 * Malformed or missing focus fields degrade to a Model consult rather than a
 * refused open. Hand-encoded query string: the Lucid extension sandbox has no
 * `URLSearchParams` (smoke 2026-09-04 — `new URLSearchParams()` threw a
 * ReferenceError the router swallowed, so the click did nothing).
 */
export class AdvisorConsultModal extends RoutingModal {
  constructor(
    client: EditorClient,
    opts: { focusType?: string; focusId?: string; focusName?: string; mode?: string; modalSize?: ModalSize },
  ) {
    const pairs: Array<[string, string]> = [
      ['view', 'advisor'],
      ['apiBaseUrl', getApiBaseUrl() ?? ''],
      ['title', 'Ask the Advisor'],
      ['focusType', opts.focusType ?? 'Model'],
      ['focusId', opts.focusId ?? ''],
    ];
    if (opts.focusName) pairs.push(['focusName', opts.focusName]);
    pairs.push(['mode', opts.mode ?? 'definition']);
    const url = `quodsim-react/index.html?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts = size === 'fullscreen' ? { fullScreen: true as const } : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, chromeless: true, ...sizeOpts }, 'studio-embed');
  }
}
