import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';
import { getApiBaseUrl } from '../core/apiBaseUrl';
import { advisorModalUrl, type AdvisorModalOpts } from './modalUrls';

/**
 * Compiled Advisor consult (quodsim-react ?view=advisor). Chromeless: the view
 * draws its own header and Close. Uses the 'studio-embed' channel (token and
 * catalog relay). The consult carries the document inline via
 * STUDIO_CATALOG.document; a cached server model id, when known, rides along only
 * so the consult can read the model's Simulation Project.
 *
 * Malformed or missing focus fields degrade to a Model consult rather than a
 * refused open.
 */
export class AdvisorConsultModal extends RoutingModal {
  constructor(client: EditorClient, opts: AdvisorModalOpts & { modalSize?: ModalSize }) {
    const url = advisorModalUrl({ ...opts, apiBaseUrl: getApiBaseUrl() ?? '' });
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts = size === 'fullscreen' ? { fullScreen: true as const } : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, chromeless: true, ...sizeOpts }, 'studio-embed');
  }
}
