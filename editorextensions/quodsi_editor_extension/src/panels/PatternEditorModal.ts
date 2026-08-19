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
  /**
   * Invoked once this modal's iframe has closed. ModelRootHandler uses it to
   * release its "a pattern modal is open" guard -- see handleOpenPatternModal.
   * Assigned after super() (no `this` before it) and read only from
   * frameClosed, which cannot fire before the constructor returns.
   */
  private readonly onClosed?: () => void;

  constructor(
    client: EditorClient,
    opts: { shapeId: string; modalSize?: ModalSize; onClosed?: () => void },
  ) {
    const url = `quodsim-react/index.html?view=pattern&shapeId=${encodeURIComponent(opts.shapeId)}`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, title: 'Arrival Pattern', ...sizeOpts }, 'pattern');
    this.onClosed = opts.onClosed;
  }

  /**
   * RoutingModal.frameClosed does the channel teardown; this adds the
   * open-guard release on top. Ordering: super() first, so the channel is
   * already released by the time anything reacts to the callback.
   */
  protected frameClosed(): void {
    super.frameClosed();
    this.onClosed?.();
  }
}
