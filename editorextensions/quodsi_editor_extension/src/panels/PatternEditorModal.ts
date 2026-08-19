import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts the arrival-pattern editor in the packaged extension's own
 * quodsim-react bundle (?view=pattern), over the whole Lucid application.
 *
 * The editor used to render inside the 300px right-dock panel iframe, where
 * PatternModal's `position: fixed` resolved against that iframe's own
 * viewport (so `95vw` meant 95% of 300px, not the screen). Only a real Lucid
 * `Modal` -- constructed here, by the host -- draws over the whole app.
 * Registers the 'pattern' channel, same wiring StudioEmbedModal uses for
 * 'studio-embed'.
 */
export class PatternEditorModal extends RoutingModal {
  constructor(
    client: EditorClient,
    opts: { shapeId: string; modalSize?: ModalSize },
  ) {
    const url = `quodsim-react/index.html?view=pattern&shapeId=${encodeURIComponent(opts.shapeId)}`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, title: 'Arrival Pattern', ...sizeOpts }, 'pattern');
  }
}
