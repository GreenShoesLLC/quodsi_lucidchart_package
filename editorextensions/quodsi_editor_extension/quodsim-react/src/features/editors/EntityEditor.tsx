import React, { useState, useEffect } from "react";
import { Settings, Hash, Info } from "lucide-react";
import { Entity, SimulationObjectType, StateListManager, ComponentType } from "@quodsi/shared";
import StatesEditor from "./StatesEditor";

interface Props {
  entity: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
}

type EntityTab = "basic" | "states";

const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel, states, onStatesChange }) => {
  // Helper function to extract entity data from various formats
  const extractEntityData = (ent: any): Entity => {
    const data = (ent as any).data || ent;

    return {
      id: data.id || "",
      name: data.name || "New Entity",
      type: SimulationObjectType.Entity,
      x: data.x || 0,
      y: data.y || 0,
      // Include inherited methods from PositionedSimulationObject
      setLocation: (x: number, y: number) => {
        if (typeof ent.setLocation === 'function') {
          ent.setLocation(x, y);
        }
      },
      getLocation: () => ent.getLocation?.() || { x: data.x || 0, y: data.y || 0 },
      hasLocation: () => ent.hasLocation?.() || false,
      clone: () => ent.clone?.() || ent,
      resetLocation: () => ent.resetLocation?.(),
      toJSON: () => ent.toJSON?.() || data,
    } as Entity;
  };

  // State management
  const [formData, setFormData] = useState<Entity>(() => extractEntityData(entity));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<EntityTab>("basic");

  // Sync with entity prop changes (only when no unsaved changes and not saving)
  useEffect(() => {
    if (!hasChanges && !isSaving) {
      setFormData(extractEntityData(entity));
    }
  }, [entity, hasChanges, isSaving]);

  // Clear the saving flag after a short delay to allow for the new data to arrive
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsSaving(false);
        setHasChanges(false);
      }, 500); // Give the parent component time to update

      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // Create a new object that preserves Entity type
      return {
        ...prev,
        [name]: value,
        // Preserve Entity class methods
        setLocation: prev.setLocation,
        getLocation: prev.getLocation,
        hasLocation: prev.hasLocation,
        clone: prev.clone,
        resetLocation: prev.resetLocation,
        toJSON: prev.toJSON,
      } as Entity;
    });
    setHasChanges(true);
  };

  // Save handler
  const handleSave = () => {
    // Create a new Entity instance with updated data
    const updatedEntity = new Entity(
      formData.id,
      formData.name,
      formData.x,
      formData.y
    );

    onSave(updatedEntity);
    setIsSaving(true); // Will be cleared by useEffect after 500ms
  };

  // Cancel handler - resets form without closing the editor
  const handleCancel = () => {
    setFormData(extractEntityData(entity));
    setHasChanges(false);
  };

  return (
    <div className="space-y-2">
      {/* Tab Navigation */}
      <div className="border-b bg-gray-50">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            title="Basic Settings"
            className={`px-3 py-2 border-b-2 ${
              activeTab === "basic"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("states")}
            title="State Definitions"
            className={`px-3 py-2 border-b-2 ${
              activeTab === "states"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Hash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-2">
        {activeTab === "basic" && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Settings className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Basic Settings</span>
              <span title="Configure entity template name and properties. Entity templates define the types of entities that flow through the simulation">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <div className="space-y-4">
              {/* Name Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entity Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter entity name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this entity template
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "states" && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Hash className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">State Definitions</span>
              <span title="Define custom state variables that entities of this type can carry and modify during simulation">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.ENTITY}
            />
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons - Only show for Basic tab (States auto-save) */}
      {activeTab !== "states" && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-3 py-1.5 text-xs rounded ${
              hasChanges
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(EntityEditor);
