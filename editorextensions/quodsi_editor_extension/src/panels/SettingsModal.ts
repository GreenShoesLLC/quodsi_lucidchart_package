import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts the shared Settings screen (quodsi_studio's
 * `SettingsPanel`) in the packaged extension's own quodsim-react bundle
 * (?view=settings), over the whole Lucid application. Registers the
 * 'settings' channel, same wiring PatternEditorModal/ScheduleEditorModal use
 * for 'pattern'/'schedule'.
 *
 * UNLIKE those two, Settings is GLOBAL -- it has no shapeId and no element
 * context at all. SettingsPanel reads and writes the viewer's own view
 * preference directly (localStorage), so this modal's payload carries only
 * an optional modalSize; there is nothing to validate as "missing" the way
 * PatternEditorModal/ScheduleEditorModal validate shapeId.
 *
 * TITLED -- same as PatternEditorModal/ScheduleEditorModal, and for the same
 * reason: Lucid's own chrome gives this modal a native title bar whose X
 * closes it with no code of ours. SettingsPanel draws its own header (with
 * its own X, wired to CLOSE_MODAL via SettingsEditorView) as a second exit,
 * same doubled-chrome tradeoff those two modals accept.
 */
export class SettingsModal extends RoutingModal {
  /**
   * Invoked once this modal's iframe has closed. ModelRootHandler uses it to
   * release its "a settings modal is open" guard -- see
   * handleOpenSettingsModal. Assigned after super() (no `this` before it)
   * and read only from frameClosed, which cannot fire before the constructor
   * returns.
   */
  private readonly onClosed?: () => void;

  constructor(client: EditorClient, opts: { modalSize?: ModalSize; onClosed?: () => void }) {
    const url = `quodsim-react/index.html?view=settings`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, title: 'Settings', ...sizeOpts }, 'settings');
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
