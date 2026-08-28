import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts the WORK-SCHEDULE editor (time-varying capacity, spec
 * 2026-08-27 §6) in the packaged extension's own quodsim-react bundle
 * (?view=work-schedule), over the whole Lucid application. Registers the
 * 'work-schedule' channel, the same wiring ScheduleEditorModal uses for
 * 'schedule' and PatternEditorModal for 'pattern'.
 *
 * TITLED, for the reason ScheduleEditorModal's own header sets out at length:
 * Lucid's native title bar gives the modal an X that works with no code of
 * ours, and a chromeless modal whose ONLY exit is a CLOSE_MODAL round trip is
 * unclosable the moment that seam misfires. Doubled chrome is the cheaper
 * cost. WorkScheduleModal's `hideHeader` prop then drops its OWN header row
 * so the two title bars don't stack.
 *
 * THE ONE DIFFERENCE FROM ITS TWO SIBLINGS: this modal is addressed by a
 * SCHEDULE id, not a shape id. Both sibling editors edit a record owned 1:1
 * by one generator, so the generator's shape id identifies the record; a work
 * schedule is a model-level record any number of Resources and Activities may
 * follow, and the thing being edited here is the schedule itself.
 * WorkScheduleModal's own prop is `scheduleId` and says exactly this.
 */
export class WorkScheduleEditorModal extends RoutingModal {
  /**
   * Invoked once this modal's iframe has closed. ModelRootHandler uses it to
   * release its "a work-schedule modal is open" guard -- see
   * handleOpenWorkScheduleModal. Assigned after super() (no `this` before it)
   * and read only from frameClosed, which cannot fire before the constructor
   * returns.
   */
  private readonly onClosed?: () => void;

  constructor(
    client: EditorClient,
    opts: { scheduleId: string; modalSize?: ModalSize; onClosed?: () => void },
  ) {
    const url = `quodsim-react/index.html?view=work-schedule&scheduleId=${encodeURIComponent(opts.scheduleId)}`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, title: 'Work Schedule', ...sizeOpts }, 'work-schedule');
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
