import { EditorClient } from 'lucid-extension-sdk';
import { RoutingModal } from './RoutingModal';

/**
 * Fixed, compact size, like StatusModal: Settings is a short list, and at the
 * Window size preference (up to 1600x1000) it sat in a mostly empty, scrolling
 * window.
 */
const SETTINGS_MODAL_SIZE = { width: 560, height: 640 } as const;

/**
 * Modal that hosts the shared Settings screen (quodsi_studio's
 * `SettingsPanel`) in the packaged extension's own quodsim-react bundle
 * (?view=settings), over the whole Lucid application. Registers the
 * 'settings' channel, same wiring PatternEditorModal/ScheduleEditorModal use
 * for 'pattern'/'schedule'.
 *
 * UNLIKE those two, Settings is GLOBAL -- it has no shapeId and no element
 * context at all. SettingsPanel reads and writes the viewer's own view
 * preference directly (localStorage), so this modal takes no payload; there
 * is nothing to validate as "missing" the way PatternEditorModal/
 * ScheduleEditorModal validate shapeId. Its one message to the host is
 * TOUR_START ("Take the tour"), handled by TourHandler.
 *
 * TITLED -- same as PatternEditorModal/ScheduleEditorModal, and for the same
 * reason: Lucid's own chrome gives this modal a native title bar whose X
 * closes it with no code of ours. UNLIKE those two, SettingsEditorView does
 * NOT also wire SettingsPanel's own close button to CLOSE_MODAL. Review
 * finding: passing `onClose` doubled the close affordance (Lucid's native X
 * plus SettingsPanel's own), and unlike ScheduleModal -- which takes a
 * `hideHeader` prop ScheduleEditorView sets specifically to collapse this
 * redundancy -- SettingsPanel has no such prop. The correct equivalent here
 * is simply omitting `onClose`: SettingsPanel's own X only renders when
 * `onClose` is supplied (`{onClose && (...)}`), so leaving it undefined
 * removes the second X and the native title bar becomes the only way out.
 * The view also passes `showTitle={false}`, so the title appears once.
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

  constructor(client: EditorClient, opts: { onClosed?: () => void } = {}) {
    const url = `quodsim-react/index.html?view=settings`;
    super(client, { url, title: 'Settings', ...SETTINGS_MODAL_SIZE }, 'settings');
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
