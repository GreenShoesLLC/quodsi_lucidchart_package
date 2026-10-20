import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';
import { getApiBaseUrl } from '../core/apiBaseUrl';
import { studiesModalUrl } from './modalUrls';

/**
 * Compiled Studies surface (quodsim-react ?view=studies). Chromeless: the
 * view draws its own header and Close. Uses the 'studio-embed' channel.
 *
 * `documentId` is the document the modal opens over (the tour host checks it).
 * `modelId` is the cached server model id when the host already knows it;
 * either way the view pulls the sync outcome with REQUEST_STUDIES_MODEL_SYNC
 * (see SimulationRunHandler.handleRequestStudiesModelSync).
 */
export class StudiesModal extends RoutingModal {
  constructor(client: EditorClient, opts: { modelId?: string; tab?: 'project'; documentId?: string; pageId?: string; modalSize?: ModalSize }) {
    const url = studiesModalUrl({
      modelId: opts.modelId, tab: opts.tab, documentId: opts.documentId, pageId: opts.pageId,
      apiBaseUrl: getApiBaseUrl() ?? '',
    });
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts = size === 'fullscreen' ? { fullScreen: true as const } : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, chromeless: true, ...sizeOpts }, 'studio-embed');
  }
}
