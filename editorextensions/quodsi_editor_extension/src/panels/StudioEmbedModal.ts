import { EditorClient } from 'lucid-extension-sdk';
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
    opts: { title: string; studioPath: string; fullScreenPath?: string },
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
    super(client, { title: opts.title, url, width: 1000, height: 700 }, 'studio-embed');
  }
}
