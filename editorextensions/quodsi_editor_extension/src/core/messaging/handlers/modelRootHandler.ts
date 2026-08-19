import { EnvelopeBase, EnvelopeMessageType, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';

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

      default:
        return false;
    }
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

    router.send('model', {
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
    const data = msg.data as { patch: Record<string, unknown> };

    log.debug('Model-root update requested', { keys: Object.keys(data.patch ?? {}) });

    try {
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(ModelManager.getClient());
      const currentPage = viewport.getCurrentPage();
      if (!currentPage) {
        throw new Error('Current page not available');
      }

      await modelManager.updateModelRoot(data.patch, currentPage);
      await modelManager.validateModel();

      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: { success: true },
      });

      // Push the fresh projection so React's cache updates without a
      // round-trip request of its own. Safe to rely on updateModelRoot NOT
      // invalidating the cache itself: validateModel() above already forced
      // a rebuild, so this snapshot reflects the just-written patch.
      await ModelRootHandler.sendSnapshot(msg.id);

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
    }
  }
}
