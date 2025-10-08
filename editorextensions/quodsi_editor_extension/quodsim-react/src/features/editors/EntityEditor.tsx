import React from "react";
import { Settings, DollarSign, Hash } from "lucide-react";
import { Entity, SimulationObjectType, StateListManager, ComponentType } from "@quodsi/shared";
import BaseEditor from "./BaseEditor";
import StatesEditor from "./StatesEditor";

interface Props {
  entity: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
}

type EntityTab = "basic" | "finance" | "states";

const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel, states, onStatesChange }) => {
  const [activeTab, setActiveTab] = React.useState<EntityTab>("basic");

  return (
    <BaseEditor
      data={{
        ...entity,
        type: SimulationObjectType.Entity,
        // Ensure all Entity methods are available
        setLocation: (x: number, y: number) => entity.setLocation(x, y),
        getLocation: () => entity.getLocation(),
        hasLocation: () => entity.hasLocation(),
        clone: () => entity.clone(),
        resetLocation: () => entity.resetLocation(),
        toJSON: () => entity.toJSON(),
      }}
      onSave={(updatedData) => {
        // Create a new Entity instance to preserve class methods
        const updatedEntity = new Entity(
          updatedData.id,
          updatedData.name,
          updatedData.x,
          updatedData.y
        );

        onSave(updatedEntity);
      }}
      onCancel={onCancel}
      messageType="entitySaved"
    >
      {(localEntity, handleChange) => (
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
                onClick={() => setActiveTab("finance")}
                title="Financial Settings"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "finance"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("states")}
                title="State Management"
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
                      value={localEntity.name}
                      onChange={handleChange}
                      placeholder="Enter entity name"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique identifier for this entity template
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "finance" && (
              <div className="p-4 text-center text-gray-500">
                <p className="text-xs">Financial properties coming soon</p>
              </div>
            )}

            {activeTab === "states" && (
              <StatesEditor
                states={states}
                onStatesChange={onStatesChange}
                defaultComponentType={ComponentType.ENTITY}
              />
            )}
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(EntityEditor);
