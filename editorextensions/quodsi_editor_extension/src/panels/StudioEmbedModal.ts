import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/shared';
import { RoutingModal } from './RoutingModal';
import { getStudioBaseUrl } from '../core/messaging/handlers/authHandler';

/**
 * Generic modal that embeds any Studio path in the Lucid extension. Hosts
 * quodsim-react's ?view=studio-embed, which renders EmbeddedStudioFrame at the
 * given studioPath and (optionally) a "↗ open full screen" pop-out to
 * fullScreenPath. Registers the 'studio-embed' channel for the token relay.
 */
export class StudioEmbedModal extends RoutingModal {
  constructor(
    client: EditorClient,
    opts: { title: string; studioPath: string; fullScreenPath?: string; modalSize?: ModalSize },
  ) {
    const studioOrigin = getStudioBaseUrl();
    let url =
      `quodsim-react/index.html?view=studio-embed` +
      `&studioPath=${encodeURIComponent(opts.studioPath)}`;
    if (studioOrigin) {
      url += `&studioOrigin=${encodeURIComponent(studioOrigin)}`;
    }
    if (opts.fullScreenPath) {
      url += `&fullScreenPath=${encodeURIComponent(opts.fullScreenPath)}`;
    }
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { title: opts.title, url, ...sizeOpts }, 'studio-embed');
  }
}
