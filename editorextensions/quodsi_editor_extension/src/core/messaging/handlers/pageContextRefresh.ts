// editorextensions/quodsi_editor_extension/src/core/messaging/handlers/pageContextRefresh.ts
//
// The panel refresh after a handler changes what the current page is (or
// whether it is a model): shared by DiagramMappingRelayHandler (after a
// Convert) and TourHandler (after building the onboarding example page).
import { Viewport, DocumentProxy, EditorClient } from 'lucid-extension-sdk';
import { EnvelopeMessageType, getLogger } from '@quodsi/lucid-shared';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { SelectionHandler } from './selection';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
import { canonicalModelName, pushModelDefinitionSnapshot } from '../../sync/scenarioSync';

const log = getLogger('PageContextRefresh');

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Post-change UI + DB refresh. Recovered from the deleted
 * ConversionPreviewHandler.handleApplyConversion (git ce884d4): broadcasts
 * MODEL_CONTEXT and re-runs SelectionHandler context (sends a fresh
 * SELECTION_CHANGED so the editor panel -- including a shape that's still
 * selected behind a modal -- reflects the change). For a model page
 * (`isQuodsiModel`, the post-Convert case) it also registers the model row
 * and seeds the model-definition snapshot for the Studies catalog; an
 * unconverted page (the onboarding example before its Convert step) has no
 * model to register, so that half is skipped.
 * Best-effort; never throws or rejects into the caller. The returned promise
 * settles once MODEL_CONTEXT and the selection refresh have been sent (the
 * model-row registration after that stays fire-and-forget): TourHandler
 * awaits it so the panel learns the page changed before the tour does.
 */
export function refreshPageContext(
  client: EditorClient,
  pageId: string,
  modelManager: ModelManager,
  opts: { isQuodsiModel: boolean },
): Promise<void> {
  const document = new DocumentProxy(client);
  const { isQuodsiModel } = opts;
  return Promise.resolve().then(async () => {
    const documentId = document.id;
    const title = document.getTitle() || 'Untitled Document';

    router.send('model', {
      id: generateId(),
      type: EnvelopeMessageType.MODEL_CONTEXT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { documentId, title, pageId, isQuodsiModel, hasValidModel: isQuodsiModel },
    });

    // Document-level context (transitions a freshly-converted page to "is a model").
    SelectionHandler.setDocumentContext(documentId, pageId, title, isQuodsiModel);

    // Re-process the current selection so a shape that's still selected behind the
    // modal refreshes its element editor. setDocumentContext alone does NOT
    // re-broadcast the selected element's data -- this mirrors
    // elementOpsHandler's post-save SELECTION refresh.
    try {
      const selectedItems = new Viewport(client).getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);
    } catch (e) {
      log.error('refreshPageContext: selection refresh failed', e);
    }

    log.debug('refreshPageContext: sent context refresh messages');

    if (!isQuodsiModel) return;

    const modelName = await canonicalModelName(modelManager);
    LucidDataActionUtility.performDataAction(client, {
      dataConnectorName: 'quodsi_api_data_connector',
      actionName: 'UpsertModel',
      actionData: { documentId, pageId, modelName },
      asynchronous: false,
    }).then(() => {
      log.debug('refreshPageContext: model registered in database');
      void pushModelDefinitionSnapshot(client, { documentId, pageId, modelName }).catch(err => {
        log.error('refreshPageContext: failed to seed model snapshot:', err);
      });
    }).catch(err => {
      log.error('refreshPageContext: failed to register model in database:', err);
    });
  }).catch(error => {
    log.error('refreshPageContext: error in refresh:', error);
  });
}
