import { EnvelopeBase, EnvelopeMessageType, ModalSize, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { PanelRole } from '../types';
import { PatternEditorModal } from '../../../panels/PatternEditorModal';
import { ScheduleEditorModal } from '../../../panels/ScheduleEditorModal';
import { WorkScheduleEditorModal } from '../../../panels/WorkScheduleEditorModal';
import { SettingsModal } from '../../../panels/SettingsModal';
import { SelectionHandler } from './selection/SelectionHandler';

const log = getLogger('ModelRootHandler');

/**
 * Generic model-root route: read a plain-data projection, write a whole patch.
 *
 * Deliberately NOT per-key. Key dispatch happens once, inside
 * ModelManager.updateModelRoot; this handler forwards the patch verbatim.
 */
export class ModelRootHandler {
  /**
   * The pattern-editor modal currently open, if any. Set synchronously in
   * handleOpenPatternModal (before show(), so a second click in the same tick
   * already sees it) and cleared by that modal's own frameClosed callback.
   */
  private static openPatternModal: PatternEditorModal | null = null;

  /**
   * The schedule-editor modal currently open, if any. Same guard shape as
   * openPatternModal above -- set synchronously in
   * handleOpenScheduleModal (before show(), so a second click in the same
   * tick already sees it) and cleared by that modal's own frameClosed
   * callback.
   */
  private static openScheduleModal: ScheduleEditorModal | null = null;

  /**
   * The work-schedule-editor modal currently open, if any. Same guard shape
   * as the two above, and a SEPARATE holder on purpose: the three are
   * separate singleton channels, so one being open must not block another.
   */
  private static openWorkScheduleModal: WorkScheduleEditorModal | null = null;

  /**
   * The settings modal currently open, if any. Same guard shape as the
   * three above, and a SEPARATE holder on purpose -- see
   * openWorkScheduleModal's comment for why: these are separate singleton
   * channels, so one being open must not block another.
   */
  private static openSettingsModal: SettingsModal | null = null;

  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.MODEL_ROOT_REQUEST:
        ModelRootHandler.sendSnapshot(msg.id)
          .catch(err => log.error('Error sending model-root snapshot:', err));
        return true;

      case EnvelopeMessageType.MODEL_ROOT_UPDATE:
        ModelRootHandler.handleUpdate(msg)
          .catch(err => log.error('Error in handleUpdate:', err));
        return true;

      case EnvelopeMessageType.OPEN_PATTERN_MODAL:
        ModelRootHandler.handleOpenPatternModal(msg);
        return true;

      case EnvelopeMessageType.OPEN_SCHEDULE_MODAL:
        ModelRootHandler.handleOpenScheduleModal(msg);
        return true;

      case EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL:
        ModelRootHandler.handleOpenWorkScheduleModal(msg);
        return true;

      case EnvelopeMessageType.OPEN_SETTINGS_MODAL:
        ModelRootHandler.handleOpenSettingsModal(msg);
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle OPEN_PATTERN_MODAL: open the arrival-pattern editor in a real
   * Lucid modal over the whole application. Lives here (not
   * simulationRunHandler) because the pattern editor is a model-root-adjacent
   * editor with no server-side model to resolve -- unlike the embedded Studio
   * surfaces (Studies, Diagram Mapping), it needs nothing but the shape id
   * already on hand, and this file is where the model-root projection it
   * edits (arrivalPatterns) is otherwise read/written.
   */
  private static handleOpenPatternModal(msg: EnvelopeBase): void {
    const data = msg.data as { shapeId?: string; modalSize?: ModalSize };
    if (!data?.shapeId) {
      log.error('OPEN_PATTERN_MODAL: missing shapeId');
      return;
    }

    // SINGLETON GUARD. 'pattern' is a singleton channel on the router, and
    // this path has no server round trip to slow the button down (unlike the
    // Studies surfaces, which at least had an UpsertModel in the way). A
    // double-click therefore opened TWO modals, and the second one's
    // frameLoaded re-registered the channel over the first: the first modal's
    // replies were then routed to the second, and its own writes hung for the
    // full 30s MODEL_ROOT_UPDATE timeout before rejecting.
    //
    // There is no precedent for a singleton-surface guard elsewhere in this
    // codebase (the embed modals are all unguarded), so this keeps it as
    // simple as possible: hold the open modal, refuse a second open, release
    // on frameClosed. The release is identity-checked so a late frameClosed
    // from an earlier modal cannot clear a newer one's claim -- the same race
    // RoutingModal.frameClosed already guards its channel teardown against.
    if (ModelRootHandler.openPatternModal) {
      log.debug('OPEN_PATTERN_MODAL: a pattern modal is already open; ignoring');
      return;
    }

    const modal = new PatternEditorModal(ModelManager.getClient(), {
      shapeId: data.shapeId,
      modalSize: data.modalSize,
      onClosed: () => {
        if (ModelRootHandler.openPatternModal === modal) {
          ModelRootHandler.openPatternModal = null;
        }
      },
    });
    ModelRootHandler.openPatternModal = modal;
    modal.show();
  }

  /**
   * Handle OPEN_SCHEDULE_MODAL: open the scheduled-arrival editor in a real
   * Lucid modal over the whole application. Mirrors handleOpenPatternModal
   * above -- see its comment for why this lives here and why the guard
   * exists -- with 'schedule' standing in for 'pattern' throughout.
   */
  private static handleOpenScheduleModal(msg: EnvelopeBase): void {
    const data = msg.data as { shapeId?: string; modalSize?: ModalSize };
    if (!data?.shapeId) {
      log.error('OPEN_SCHEDULE_MODAL: missing shapeId');
      return;
    }

    // SINGLETON GUARD -- see handleOpenPatternModal's comment for the full
    // rationale (same hazard, same fix: hold the open modal, refuse a
    // second open, release on frameClosed, identity-checked).
    if (ModelRootHandler.openScheduleModal) {
      log.debug('OPEN_SCHEDULE_MODAL: a schedule modal is already open; ignoring');
      return;
    }

    const modal = new ScheduleEditorModal(ModelManager.getClient(), {
      shapeId: data.shapeId,
      modalSize: data.modalSize,
      onClosed: () => {
        if (ModelRootHandler.openScheduleModal === modal) {
          ModelRootHandler.openScheduleModal = null;
        }
      },
    });
    ModelRootHandler.openScheduleModal = modal;
    modal.show();
  }

  /**
   * Handle OPEN_WORK_SCHEDULE_MODAL: open the work-schedule editor (spec
   * 2026-08-27 §6) in a real Lucid modal over the whole application. Mirrors
   * handleOpenScheduleModal above -- see handleOpenPatternModal's comment for
   * why this lives here and why the guard exists.
   *
   * The payload carries a SCHEDULE id, not a shape id. A work schedule is a
   * model-level record shared by any number of Resources and Activities; the
   * shape that FOLLOWS one is edited by the Resource/Activity capacity
   * control, not by this modal. A message without one opens nothing and does
   * NOT take the guard -- a malformed message must not lock the surface.
   */
  private static handleOpenWorkScheduleModal(msg: EnvelopeBase): void {
    const data = msg.data as { scheduleId?: string; modalSize?: ModalSize };
    if (!data?.scheduleId) {
      log.error('OPEN_WORK_SCHEDULE_MODAL: missing scheduleId');
      return;
    }

    // SINGLETON GUARD -- see handleOpenPatternModal's comment for the full
    // rationale (same hazard, same fix: hold the open modal, refuse a second
    // open, release on frameClosed, identity-checked).
    if (ModelRootHandler.openWorkScheduleModal) {
      log.debug('OPEN_WORK_SCHEDULE_MODAL: a work-schedule modal is already open; ignoring');
      return;
    }

    const modal = new WorkScheduleEditorModal(ModelManager.getClient(), {
      scheduleId: data.scheduleId,
      modalSize: data.modalSize,
      onClosed: () => {
        if (ModelRootHandler.openWorkScheduleModal === modal) {
          ModelRootHandler.openWorkScheduleModal = null;
        }
      },
    });
    ModelRootHandler.openWorkScheduleModal = modal;
    modal.show();
  }

  /**
   * Handle OPEN_SETTINGS_MODAL: open the shared Settings screen in a real
   * Lucid modal over the whole application. Mirrors handleOpenScheduleModal
   * above -- see handleOpenPatternModal's comment for why this lives here
   * and why the guard exists -- with 'settings' standing in for 'schedule'.
   *
   * UNLIKE the pattern/schedule/work-schedule modals, Settings is GLOBAL: it
   * has no shapeId and no element context, so there is no "missing id"
   * case to log-and-return on -- an absent `data` (or an absent
   * `modalSize` within it) is not a malformed message, just the default.
   */
  private static handleOpenSettingsModal(msg: EnvelopeBase): void {
    const data = (msg.data ?? {}) as { modalSize?: ModalSize };

    // SINGLETON GUARD -- see handleOpenPatternModal's comment for the full
    // rationale (same hazard, same fix: hold the open modal, refuse a
    // second open, release on frameClosed, identity-checked).
    if (ModelRootHandler.openSettingsModal) {
      log.debug('OPEN_SETTINGS_MODAL: a settings modal is already open; ignoring');
      return;
    }

    const modal = new SettingsModal(ModelManager.getClient(), {
      modalSize: data.modalSize,
      onClosed: () => {
        if (ModelRootHandler.openSettingsModal === modal) {
          ModelRootHandler.openSettingsModal = null;
        }
      },
    });
    ModelRootHandler.openSettingsModal = modal;
    modal.show();
  }

  /**
   * Determine which channel to send a response to based on the message
   * source. Mirrors SimulationRunHandler.getResponseChannel /
   * DiagramMappingRelayHandler.getResponseChannel: a message that
   * originates from the pattern-editor modal ('pattern-iframe') or the
   * schedule-editor modal ('schedule-iframe') gets its reply routed back to
   * that modal's own channel; everything else (the side panel, source
   * 'model-iframe') goes to 'model' -- the same channel this handler always
   * used before either modal existed, so a panel-originated request is
   * unaffected.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'pattern-iframe') return 'pattern';
    if (msg.source === 'schedule-iframe') return 'schedule';
    if (msg.source === 'work-schedule-iframe') return 'work-schedule';
    if (msg.source === 'settings-iframe') return 'settings';
    // The embedded Studio iframe (Advisor write half) writes through the
    // panel's EmbeddedStudioFrame with source 'studio-embed-iframe'; its
    // RESULT must come back on the studio-embed channel or the iframe's
    // write hangs for the full 30 s timeout.
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  /** Push the current projection to React. Also called after every write. */
  public static async sendSnapshot(correlationId: string): Promise<void> {
    const modelManager = ModelManager.getInstance();
    const viewport = new Viewport(ModelManager.getClient());
    const currentPage = viewport.getCurrentPage();
    if (!currentPage) {
      throw new Error('Current page not available');
    }

    const projection = await modelManager.buildModelRootProjection(currentPage);

    // Sent to the surfaces that CONSUME a model-root snapshot -- the side
    // panel, the pattern-editor modal, and the schedule-editor modal --
    // rather than broadcast.
    //
    // Both must still receive it: that was the point of the change that
    // introduced the broadcast (the panel's summary has to stay in sync while
    // the modal is open editing the same model root). What broadcast added on
    // top of that was pure cost. MessageRouter.send('broadcast') iterates ALL
    // FOUR roles and ChannelManager.enqueueOrSend QUEUES for any channel with
    // no panel, so every snapshot was retained forever in the 'results' and
    // 'studio-embed' queues (neither surface reads MODEL_ROOT_SNAPSHOT, so
    // nothing ever drains them until one happens to open), and
    // ensureChannelHasPanel logged an error-level "Could not recover panel
    // for ..." three times per snapshot -- at a level production prints.
    //
    // WHY THIS SHAPE AND NOT A ROUTER CHANGE. The alternative was teaching the
    // router/ChannelManager to skip the enqueue for a "snapshot class" of
    // message. The router has no concept of message classes -- its send() is
    // deliberately per-target, and this file's own getResponseChannel already
    // picks a target per message. Naming targets is using the router as
    // designed; a message-class exception would be new machinery on a shared
    // component for one message type.
    //
    // 'model' is sent unconditionally -- its queue is legitimate: a snapshot
    // that predates REACT_APP_READY must wait for the panel, and that queue is
    // drained on ready. 'pattern' and 'schedule' are each skipped when no
    // modal is registered on that channel, because a closed modal's queue is
    // never drained by anyone (RoutingModal clears it on frameClosed) -- and
    // a modal that opens LATER asks for its own snapshot on mount via
    // MODEL_ROOT_REQUEST, so it loses nothing.
    const channelManager = router.getChannelManager();
    const targets: PanelRole[] = ['model'];
    if (channelManager.getChannel('pattern')?.panel) {
      targets.push('pattern');
    }
    if (channelManager.getChannel('schedule')?.panel) {
      targets.push('schedule');
    }
    // Same skip-when-closed rule as 'pattern'/'schedule' above: a closed
    // modal's queue is never drained by anyone, and a modal that opens later
    // asks for its own snapshot on mount via MODEL_ROOT_REQUEST.
    if (channelManager.getChannel('work-schedule')?.panel) {
      targets.push('work-schedule');
    }

    for (const target of targets) {
      // A fresh envelope per target: router.send mutates msg.target in place,
      // so a shared object would leave the second send stamping over the first.
      router.send(target, {
        id: correlationId,
        type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
        source: 'host',
        target: `${target}-iframe`,
        version: '1.0',
        data: { projection },
      });
    }
  }

  private static async handleUpdate(msg: EnvelopeBase): Promise<void> {
    // The WHOLE patch, forwarded verbatim -- no key inspection here.
    // Guarded the same way the log line below already was: an unwrapped or
    // missing payload must not throw a confusing `Object.keys(undefined)`
    // TypeError out of this handler.
    const data = msg.data as { patch?: Record<string, unknown> };
    const patch = data.patch ?? {};

    log.debug('Model-root update requested', { keys: Object.keys(patch) });

    const channel = ModelRootHandler.getResponseChannel(msg);

    try {
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(ModelManager.getClient());
      const currentPage = viewport.getCurrentPage();
      if (!currentPage) {
        throw new Error('Current page not available');
      }

      await modelManager.updateModelRoot(patch, currentPage);
      await modelManager.validateModel();

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true },
      });

    } catch (error) {
      log.error('Error updating model root', error);
      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      // Push a fresh snapshot behind the failure result. React's
      // createModelRootSource.saveModel merges the patch into its cached
      // projection OPTIMISTICALLY before sending, so a write the host
      // rejected would otherwise leave the echoed (never-persisted) value on
      // screen until some unrelated event happened to refresh the cache.
      // Deliberately AFTER the result send, so the panel's saveModel promise
      // rejects first and the corrective snapshot lands behind it; and with
      // its own independent error log, same posture as the success path's
      // snapshot below. No selection re-process here -- see handleUpdate's
      // tail: there is nothing new to reflect after a rejected write.
      ModelRootHandler.sendSnapshot(msg.id)
        .catch(err => log.error('Error sending model-root snapshot after failed update:', err));
      return;
    }

    // Push the fresh projection so React's cache updates without a
    // round-trip request of its own. Deliberately OUTSIDE the try/catch
    // above: the write already succeeded and its MODEL_ROOT_UPDATE_RESULT
    // was already sent, so a failure here must not re-report the write
    // itself as failed (that would tell React a durably-persisted patch
    // didn't save). It gets its own independent error log instead.
    ModelRootHandler.sendSnapshot(msg.id)
      .catch(err => log.error('Error sending post-update model-root snapshot:', err));

    // Re-process the current selection so the Activity/Generator panel's
    // referenceData (the Requirements picker's Resources group) reflects a
    // resource created or renamed on the Resources tab. Same refresh
    // handleElementConvert performs after a convert.
    try {
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      await SelectionHandler.handleLucidSelectionEvent(client, viewport.getSelectedItems(), ModelManager.getInstance());
    } catch (err) {
      log.error('Error refreshing selection after model-root update:', err);
    }
  }
}
