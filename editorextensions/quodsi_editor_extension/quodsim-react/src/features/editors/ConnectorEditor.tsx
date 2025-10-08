import React from "react";
import { Connector, SimulationObjectType, EditorReferenceData } from "@quodsi/shared";
import { Link2, Settings } from "lucide-react";
import BaseEditor from "./BaseEditor";

interface Props {
  connector: Connector;
  onSave: (connector: Connector) => void;
  onCancel: () => void;
  referenceData?: EditorReferenceData;
}

const ConnectorEditor: React.FC<Props> = ({ connector, onSave, onCancel, referenceData }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Debug log referenceData when component mounts or referenceData changes
  React.useEffect(() => {
    if (isDevelopment) {
      console.log("[ConnectorEditor] CHECKPOINT_4: ReferenceData received:", {
        hasReferenceData: !!referenceData,
        activitiesLength: referenceData?.activities?.length,
        resourcesLength: referenceData?.resources?.length,
        entitiesLength: referenceData?.entities?.length,
        hasMarker: !!(referenceData as any)?._debugMarker,
        fullReferenceData: referenceData
      });
    }
  }, [referenceData, isDevelopment]);
  
  // Also add immediate logging for debugging
  if (isDevelopment) {
    console.log("[ConnectorEditor] CHECKPOINT_4B: Current props at render:", {
      hasReferenceData: !!referenceData,
      activitiesLength: referenceData?.activities?.length,
      resourcesLength: referenceData?.resources?.length,
      entitiesLength: referenceData?.entities?.length,
      referenceDataKeys: referenceData ? Object.keys(referenceData) : 'no referenceData',
      fullReferenceDataStructure: referenceData ? {
        activities: typeof referenceData.activities,
        resources: typeof referenceData.resources,
        entities: typeof referenceData.entities,
        resourceRequirements: typeof referenceData.resourceRequirements,
        debugMarker: (referenceData as any)._debugMarker
      } : 'no referenceData'
    });
  }
  
  // Helper function to find element name by ID
  const getElementName = (elementId: string): string => {
    if (!elementId) return "Not set";
    
    if (!referenceData) {
      if (isDevelopment) {
        console.log("[ConnectorEditor] No referenceData available");
      }
      return elementId;
    }
    
    // Debug logging
    if (isDevelopment) {
      console.log("[ConnectorEditor] Looking for element:", elementId);
      console.log("[ConnectorEditor] Available elements:", {
        activities: referenceData.activities?.map(a => ({ id: a.id, name: a.name })),
        resources: referenceData.resources?.map(r => ({ id: r.id, name: r.name })),
        entities: referenceData.entities?.map(e => ({ id: e.id, name: e.name }))
      });
    }
    
    // Search in all element arrays
    const allElements = [
      ...(referenceData.activities || []),
      ...(referenceData.resources || []),
      ...(referenceData.entities || [])
    ];
    
    const element = allElements.find(el => el.id === elementId);
    
    if (isDevelopment && !element) {
      console.log("[ConnectorEditor] Element not found in referenceData:", elementId);
    }
    
    return element?.name || elementId;
  };
  return (
    <BaseEditor
      data={{
        ...connector,
        type: SimulationObjectType.Connector,
        // Ensure all Connector methods are available
        setSourceLocation: (x: number, y: number) =>
          connector.setSourceLocation(x, y),
        setTargetLocation: (x: number, y: number) =>
          connector.setTargetLocation(x, y),
        setLocation: (x: number, y: number) => connector.setLocation(x, y),
        getLocation: () => connector.getLocation(),
        hasLocation: () => connector.hasLocation(),
        clone: () => connector.clone(),
        resetLocation: () => connector.resetLocation(),
        toJSON: () => connector.toJSON(),
      }}
      onSave={(updatedData) => {
        // Create a new Connector instance to preserve class methods
        const updatedConnector = new Connector(
          updatedData.id,
          updatedData.name,
          updatedData.sourceId,
          updatedData.targetId,
          updatedData.probability,
          updatedData.operationSteps,
          updatedData.sourceX,
          updatedData.sourceY,
          updatedData.targetX,
          updatedData.targetY,
          updatedData.x,
          updatedData.y
        );

        onSave(updatedConnector);
      }}
      onCancel={onCancel}
      messageType="connectorSaved"
    >
      {(localConnector, handleChange) => {
        if (isDevelopment) {
          console.log("[ConnectorEditor] Connector data:", {
            sourceId: localConnector.sourceId,
            targetId: localConnector.targetId,
            name: localConnector.name
          });
        }
        
        return (
        <div className="space-y-2">
          {/* Basic Info */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Settings className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Basic Settings</span>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                name="name"
                className="w-full px-2 py-1 text-xs border rounded"
                value={localConnector.name}
                onChange={handleChange}
                placeholder="Connector Name"
              />
            </div>
          </div>

          {/* Connection Settings */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Link2 className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Connection Settings</span>
            </div>
            <div className="space-y-1">
              <div>
                <label className="block text-xs text-gray-600">Probability</label>
                <input
                  type="number"
                  name="probability"
                  className="w-full px-1 py-0.5 text-xs border rounded"
                  value={localConnector.probability}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.0 - 1.0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: Routing type is controlled by the source Activity
                </p>
              </div>
            </div>
          </div>

          {/* Connection Info (Read-only) - Only show if we have referenceData */}
          {referenceData && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-medium text-gray-700">Connection Details</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="p-1 bg-gray-50 rounded">
                  <span className="text-gray-600">From:</span>
                  <div className="text-gray-800 truncate" title={getElementName(localConnector.sourceId)}>
                    {getElementName(localConnector.sourceId)}
                  </div>
                </div>
                <div className="p-1 bg-gray-50 rounded">
                  <span className="text-gray-600">To:</span>
                  <div className="text-gray-800 truncate" title={getElementName(localConnector.targetId)}>
                    {getElementName(localConnector.targetId)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        );
      }}
    </BaseEditor>
  );
};

export default ConnectorEditor;
