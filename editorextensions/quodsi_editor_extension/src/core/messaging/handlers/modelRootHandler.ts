import { EnvelopeBase, EnvelopeMessageType, ModalSize, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { PatternEditorModal } from '../../../panels/PatternEditorModal';

const log = getLogger('ModelRootHandler');

/**
 * Generic model-root route: read a plain-data projection, write a whole patch.
 *
 * Deliberately NOT per-key. Key dispatch happens once, inside
 * ModelManager.updateModelRoot; this handler forwards the patch verbatim.
 */
export class ModelRootHandler {
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
    new PatternEditorModal(ModelManager.getClient(), {
      shapeId: data.shapeId,
      modalSize: data.modalSize,
    }).show();
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

    // Broadcast (not just to 'model'): the pattern modal listens on its own
    // 'pattern' channel, and both surfaces need the fresh projection so the
    // panel's summary stays in sync while the modal is open editing it.
    router.send('broadcast', {
      id: correlationId,
      type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { projection },
    });
  }

  private static async handleUpdate(msg: EnvelopeBase): Promise<void> {
    // The WHOLE patch, forwarded verbatim -- no key inspection here.
    // Guarded the same way the log line below already was: an unwrapped or
    // missing payload must not throw a confusing `Object.keys(undefined)`
    // TypeError out of this handler.
    const data = msg.data as { patch?: Record<string, unknown> };
    const patch = data.patch ?? {};

    log.debug('Model-root update requested', { keys: Object.keys(patch) });

    try {
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(ModelManager.getClient());
      const currentPage = viewport.getCurrentPage();
      if (!currentPage) {
        throw new Error('Current page not available');
      }

      await modelManager.updateModelRoot(patch, currentPage);
      await modelManager.validateModel();

      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: { success: true },
      });

    } catch (error) {
      log.error('Error updating model root', error);
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
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
  }
}
