import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
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
    // Either `studioPath` (concrete — open straight to it) OR `pending: true`
    // (open INSTANTLY in a loading state; StudioEmbedView then pulls the
    // resolved path via REQUEST_STUDIO_EMBED_PATH once its channel registers).
    opts: { title: string; studioPath?: string; pending?: boolean; fullScreenPath?: string; modalSize?: ModalSize },
  ) {
    const studioOrigin = getStudioBaseUrl();
    let url =
      `quodsim-react/index.html?view=studio-embed` +
      (opts.studioPath
        ? `&studioPath=${encodeURIComponent(opts.studioPath)}`
        : `&pending=1`) +
      // Title is rendered by our own chromeless header (StudioEmbedView), not
      // Lucid's native title bar — pass it through the URL.
      `&title=${encodeURIComponent(opts.title)}`;
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
    // chromeless: drop Lucid's native header + X (users mistook the X for a
    // sub-window close). StudioEmbedView renders our own labeled "Close".
    super(client, { url, chromeless: true, ...sizeOpts }, 'studio-embed');
  }
}
