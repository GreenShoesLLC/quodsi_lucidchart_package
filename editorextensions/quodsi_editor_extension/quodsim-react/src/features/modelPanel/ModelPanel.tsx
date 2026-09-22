import React, { useState, useEffect, useCallback } from 'react';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { useModelOpsSender } from '../../messaging/senders/modelOpsSender';
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender';
import { PanelHeader } from './PanelHeader';
import { AccountStrip } from '../shared';
import { ElementEditor } from './ElementEditor';
import { SimulationObjectType, DiagramElementType, EnvelopeMessageType, EnvelopeBase, getLogger } from '@quodsi/lucid-shared';
import { ExtendedModelItemData } from '../../types/ModelItemData';
import { getSimulationObjectType } from '../../utils/typeDetection';
import { ModelDefinitionViewer } from './ModelDefinitionViewer';
import { useMessaging } from '../../messaging/MessageProvider';
import { useModelEditorTab } from './useModelEditorTab';
import { BlankSlateConverter, HostAdvisorProvider, type AdvisorFocus } from 'quodsi_studio/platforms/shared';
import { useLucidBlankSlateAccessor } from '../../adapters/useLucidBlankSlateAccessor';

const log = getLogger('ModelPanel');

/**
 * The main ModelPanel component that serves as the container for the model panel UI.
 * This component orchestrates the state and composition of child components.
 */
export const ModelPanel: React.FC = () => {
  // Get transformed data and actions from hook
  const {
    modelName,
    currentElement,
    validationState,
    isLoading,
    needsInitialization,
    diagramElementType,
    referenceData,
    // Actions
    onElementUpdate,
    onElementTypeChange,
    onValidate,
    onRemoveModel
  } = useModelPanel();

  // Get message senders
  const {
    requestModelJson
  } = useModelOpsSender();

  // Selection context (document/page ids, selection changes) and sign-in state
  const { selection, auth } = useMessaging();

  // Simulation run senders (diagram mapping, settings and Advisor modals)
  const { openDiagramMappingModal, openSettingsModal, openAdvisorModal } = useSimulationRunSender();

  // Status opens Studio's public /status page in a browser tab (no modal).
  // The Studio origin comes from the extension's AUTH_STATUS config; without
  // one there is nowhere to go, so PanelHeader hides the Status item.
  const studioBaseUrl = auth?.config?.studioBaseUrl;
  const onOpenStatus = studioBaseUrl
    ? () => { window.open(`${studioBaseUrl}/status`, '_blank', 'noopener'); }
    : undefined;

  // The Model editor's tab, held here so it survives ElementEditor's
  // page-keyed remount (spec 2026-09-13).
  const { activeTab, onTabChange, applyPendingTab } = useModelEditorTab(onValidate);

  // The shared blank-slate card's host adapter (spec 2026-09-15 §1). Called on
  // every render (Rules of Hooks); it only talks to the host while the page is
  // unconverted.
  const blankSlateAccessor = useLucidBlankSlateAccessor({
    enabled: needsInitialization,
    documentId: selection.documentContext?.documentId ?? '',
    pageId: selection.documentContext?.pageId ?? '',
    selectionVersion: selection.lastUpdated,
  });

  // Every Advisor button in the panel -- the shared editor headers and the
  // blank-slate card -- opens the embedded consult in a Lucid host modal (spec
  // 2026-09-15 §2). Editors only open definition consults.
  const onOpenAdvisor = useCallback(
    (focus: AdvisorFocus) =>
      openAdvisorModal({ focusId: focus.id, focusType: focus.type, focusName: focus.name, mode: 'definition' }),
    [openAdvisorModal],
  );
  // Signed out, the provider supplies no context, so no Advisor button shows:
  // the consult modal cannot sign the user in. The provider itself always
  // renders, so signing in does not remount the editors below it.
  const advisorEnabled = !!auth?.isAuthenticated;

  // A "Go to Model Editor" link stores its tab before selecting the model.
  useEffect(() => {
    if (currentElement) {
      const elementType = getSimulationObjectType(
        currentElement.metadata?.type || currentElement.type,
        currentElement,
        currentElement.data
      );

      // Only consume the pending tab when showing the Model editor
      if (elementType === SimulationObjectType.Model) {
        applyPendingTab();
      }
    }
  }, [currentElement, applyPendingTab]);

  // State for Model JSON viewer modal
  const [isModelViewerOpen, setIsModelViewerOpen] = useState(false);
  const [modelJson, setModelJson] = useState<object | null>(null);

  // Handler for viewing model JSON
  const handleViewModelJson = () => {
    requestModelJson(selection.documentContext?.documentId || '');
  };

  // Listen for MODEL_JSON_RESPONSE
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase;

      if (msg?.type === EnvelopeMessageType.MODEL_JSON_RESPONSE) {
        const data = msg.data as {
          success: boolean;
          modelJson?: any;
          error?: string;
        };

        if (data.success && data.modelJson) {
          setModelJson(data.modelJson);
          setIsModelViewerOpen(true);
        } else {
          log.error('Failed to get model JSON:', data.error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Handle element type issues
    if (currentElement && (!currentElement.metadata?.type || currentElement.metadata.type === SimulationObjectType.None)) {
      // Auto-map line to connector if metadata type is missing
      if (diagramElementType === DiagramElementType.LINE) {
        currentElement.metadata = currentElement.metadata || {
          type: SimulationObjectType.None,
          version: '1.0',
          lastModified: new Date().toISOString(),
          id: currentElement.id
        };
        currentElement.metadata.type = SimulationObjectType.Connector;
      }
      // For blocks, we do not automatically assign Activity type
      // Leave it to the user to select the appropriate type
    }
  }, [modelName, currentElement, diagramElementType]);
  
  // Memoize onElementUpdate-bound callback so it has a stable identity as the
  // onSave prop ElementEditor passes down to SwimLaneEditor, the only editor
  // that still takes it. Without this, the parent's inline arrow produces a
  // new function each render, re-attaching that editor's internal effects.
  // Must stay above the early returns below so hook order is unconditional
  // every render (Rules of Hooks) — opening Diagram Mapping flips
  // isPreviewVisible and would otherwise skip this hook.
  const handleElementSave = useCallback(
    (data: any) => {
      if (currentElement) {
        onElementUpdate(currentElement.id, data);
      }
    },
    [onElementUpdate, currentElement?.id]
  );

  // Unconverted page: the shared blank-slate card (spec 2026-09-15 §1)
  if (needsInitialization) {
    return (
      <HostAdvisorProvider onOpenAdvisor={onOpenAdvisor} enabled={advisorEnabled}>
        <div className="flex flex-col h-full bg-gray-50">
          <AccountStrip />
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <BlankSlateConverter accessor={blankSlateAccessor} />
          </div>
        </div>
      </HostAdvisorProvider>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <AccountStrip />
        <div className="flex-1 min-h-0 flex items-center justify-center p-8 overflow-auto">
          <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-center space-x-2">
              <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-blue-600"></div>
              <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-blue-600 animation-delay-150"></div>
              <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-blue-600 animation-delay-300"></div>
            </div>
            <span className="mt-3 block text-gray-600 font-medium">Initializing...</span>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have any content to display - should always have content if isQuodsiModel is true
  const hasContent = modelName || currentElement;
  
  if (!hasContent) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <AccountStrip />
        <div className="flex-1 min-h-0 flex items-center justify-center p-8 overflow-auto">
          <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-400 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
            <span className="text-gray-600 font-medium">No model or element selected</span>
            <p className="text-gray-500 text-sm mt-2">Select an element in the diagram to view its properties</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if the current element is the Model itself
  const isModelElement = currentElement?.metadata?.type === SimulationObjectType.Model;

  // Swimlanes have their own header; PanelHeader's "unconverted" view is irrelevant
  const isSwimLane = currentElement?.data?.className === 'AdvancedSwimLaneBlock';

  // Main content render
  return (
    <HostAdvisorProvider onOpenAdvisor={onOpenAdvisor} enabled={advisorEnabled}>
      <div className="flex flex-col h-full bg-white shadow-md rounded-sm overflow-auto border border-gray-200">
        <AccountStrip />
        {!isSwimLane && <PanelHeader
          currentElement={currentElement}
          onRemoveModel={onRemoveModel}
          onOpenDiagramMapping={openDiagramMappingModal}
          onElementTypeChange={onElementTypeChange}
          diagramElementType={diagramElementType}
          onViewModelJson={handleViewModelJson}
          onOpenStatus={onOpenStatus}
          onOpenSettings={() => openSettingsModal()}
        />}

        <div className="flex-1 bg-gray-50 overflow-auto">
          {/* If current element exists and is either not unconverted or is a Model type */}
          {currentElement && ((!currentElement.isUnconverted) || isModelElement) && (
            <ElementEditor
              elementData={{
                ...currentElement.data,
                id: currentElement.id // Ensure ID is included in elementData
              }}
              elementType={getSimulationObjectType(
                currentElement.metadata?.type || currentElement.type,
                currentElement,
                currentElement.data
              )}
              onSave={handleElementSave}
              referenceData={referenceData}
              currentElement={currentElement}
              validationState={validationState}
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          )}
        </div>

        {/* Model Definition Viewer Modal */}
        {isModelViewerOpen && modelJson && (
          <ModelDefinitionViewer
            modelJson={modelJson}
            onClose={() => setIsModelViewerOpen(false)}
          />
        )}
      </div>
    </HostAdvisorProvider>
  );
};
