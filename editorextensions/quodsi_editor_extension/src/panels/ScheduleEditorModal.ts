import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts the scheduled-arrival editor in the packaged extension's
 * own quodsim-react bundle (?view=schedule), over the whole Lucid
 * application. Registers the 'schedule' channel, same wiring
 * PatternEditorModal uses for 'pattern'.
 *
 * TITLED -- same as PatternEditorModal, and for the same reason: Lucid's own
 * chrome gives this modal a native title bar whose X closes it with no code
 * of ours. This used to be chromeless (see git history), on the theory that
 * quodsi_studio's ScheduleModal already draws its own header/close button
 * (via its `embedded` prop) so a Lucid title bar would double the chrome.
 * That theory undersold the cost: chromeless means the ONLY way out is
 * ScheduleModal's own X asking the host to close via CLOSE_MODAL
 * (ScheduleEditorView.tsx -> RoutingModal.messageFromFrame -> hide()), an
 * untested seam with no independent fallback -- if it ever misfires, the
 * modal is unclosable. Doubled chrome (two title bars, two X's) is a smaller
 * cost than that. ScheduleModal's own X stays in place as a second exit; see
 * RoutingModal's options union: this is now the `{ title, chromeless?: false
 * }` branch, same as PatternEditorModal's.
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
    super(client, { url, title: 'Arrival Schedule', ...sizeOpts }, 'schedule');
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
