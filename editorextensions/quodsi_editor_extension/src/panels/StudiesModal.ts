import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';
import { getApiBaseUrl } from '../core/apiBaseUrl';

/**
 * Compiled Studies surface (quodsim-react ?view=studies). Chromeless: the
 * view draws its own header and Close. Uses the 'studio-embed' channel.
 *
 * `modelId` is the cached server model id when the host already knows it;
 * either way the view pulls the sync outcome with REQUEST_STUDIO_EMBED_PATH
 * (see SimulationRunHandler.handleRequestStudioEmbedPath). The query string is
 * hand-encoded: the Lucid extension sandbox has no URLSearchParams.
 */
export class StudiesModal extends RoutingModal {
  constructor(client: EditorClient, opts: { modelId?: string; modalSize?: ModalSize }) {
    const pairs: Array<[string, string]> = [
      ['view', 'studies'],
      ['apiBaseUrl', getApiBaseUrl() ?? ''],
      ['title', 'Studies'],
    ];
    if (opts.modelId) pairs.push(['modelId', opts.modelId]);
    const url = `quodsim-react/index.html?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts = size === 'fullscreen' ? { fullScreen: true as const } : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, chromeless: true, ...sizeOpts }, 'studio-embed');
  }
}
