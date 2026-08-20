import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts the scheduled-arrival editor in the packaged extension's
 * own quodsim-react bundle (?view=schedule), over the whole Lucid
 * application. Registers the 'schedule' channel, same wiring
 * PatternEditorModal uses for 'pattern'.
 *
 * CHROMELESS -- deliberately, unlike PatternEditorModal. quodsi_studio's
 * ScheduleModal renders its OWN 900x640 card with its own header and close
 * button, so a titled Lucid modal would stack a second title bar and a
 * second close button around it. Chromeless (the same shape StudioEmbedModal
 * uses) makes the Lucid modal an invisible frame, so the editor looks
 * exactly as it does in Studio. See RoutingModal's options union: this is
 * the `{ title?: never, chromeless: true }` branch, not PatternEditorModal's
 * `{ title, chromeless?: false }` one.
 */
export class ScheduleEditorModal extends RoutingModal {
  /**
   * Invoked once this modal's iframe has closed. ModelRootHandler uses it to
   * release its "a schedule modal is open" guard -- see
   * handleOpenScheduleModal. Assigned after super() (no `this` before it)
   * and read only from frameClosed, which cannot fire before the constructor
   * returns.
   */
  private readonly onClosed?: () => void;

  constructor(
    client: EditorClient,
    opts: { shapeId: string; modalSize?: ModalSize; onClosed?: () => void },
  ) {
    const url = `quodsim-react/index.html?view=schedule&shapeId=${encodeURIComponent(opts.shapeId)}`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, chromeless: true, ...sizeOpts }, 'schedule');
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
