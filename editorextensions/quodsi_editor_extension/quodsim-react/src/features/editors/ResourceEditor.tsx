import React, { useState, useEffect } from "react";
import { Settings, DollarSign, Hash, Info } from "lucide-react";
import {
  Resource,
  SimulationObjectType,
  ResourceFinancialProperties,
  StateListManager,
  ComponentType,
} from "@quodsi/shared";
import StatesEditor from "./StatesEditor";

interface Props {
  resource: Resource;
  onSave: (resource: Resource) => void;
  onCancel: () => void;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
}

type ResourceTab = "basic" | "finance" | "states";

const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel, states, onStatesChange }) => {
  // Helper function to extract resource data from various formats
  const extractResourceData = (res: any): Resource => {
    const data = res.data || res;
    const extractedResource = new Resource(
      data.id || "",
      data.name || "New Resource",
      data.capacity || 1,
      data.x || 0,
      data.y || 0
    );

    // Initialize financialProperties if it doesn't exist
    extractedResource.financialProperties = data.financialProperties
      ? ResourceFinancialProperties.fromJSON(data.financialProperties)
      : new ResourceFinancialProperties();

    return extractedResource;
  };

  // State management
  const [formData, setFormData] = useState<Resource>(() => extractResourceData(resource));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ResourceTab>("basic");

  // Sync with resource prop changes (only when no unsaved changes and not saving)
  useEffect(() => {
    if (!hasChanges && !isSaving) {
      setFormData(extractResourceData(resource));
    }
  }, [resource, hasChanges, isSaving]);

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

  // Input change handler for basic fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // Create a new object that preserves Resource type
      return {
        ...prev,
        [name]: name === 'capacity' ? parseInt(value) || 1 : value,
        // Preserve Resource class methods
        setLocation: prev.setLocation,
        getLocation: prev.getLocation,
        hasLocation: prev.hasLocation,
        clone: prev.clone,
        resetLocation: prev.resetLocation,
        toJSON: prev.toJSON,
      } as Resource;
    });
    setHasChanges(true);
  };

  // Handler for financial property changes
  const handleFinancialChange = (field: keyof ResourceFinancialProperties, value: any) => {
    setFormData(prev => {
      const currentFinancial = prev.financialProperties || new ResourceFinancialProperties();
      const updatedFinancial = new ResourceFinancialProperties({
        enabled: currentFinancial.enabled,
        costPerSeize: currentFinancial.costPerSeize,
        costPerHourUtilized: currentFinancial.costPerHourUtilized,
        costPerHourIdle: currentFinancial.costPerHourIdle,
        [field]: value,
      });

      return {
        ...prev,
        financialProperties: updatedFinancial,
        // Preserve Resource class methods
        setLocation: prev.setLocation,
        getLocation: prev.getLocation,
        hasLocation: prev.hasLocation,
        clone: prev.clone,
        resetLocation: prev.resetLocation,
        toJSON: prev.toJSON,
      } as Resource;
    });
    setHasChanges(true);
  };

  // Save handler
  const handleSave = () => {
    // Create a new Resource instance with updated data
    const updatedResource = new Resource(
      formData.id,
      formData.name,
      formData.capacity,
      formData.x,
      formData.y
    );

    // Preserve financialProperties
    updatedResource.financialProperties = formData.financialProperties;

    onSave(updatedResource);
    setIsSaving(true); // Will be cleared by useEffect after 500ms
  };

  // Cancel handler - resets form without closing the editor
  const handleCancel = () => {
    setFormData(extractResourceData(resource));
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
              <span title="Configure resource name and capacity (maximum number of concurrent uses)">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <div className="space-y-4">
              {/* Name Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Resource Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter resource name"
                />
              </div>

              {/* Capacity Section */}
              <div className="pt-3 border-t">
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-700 mb-0.5">
                    Capacity Configuration
                  </div>
                  <div className="text-xs text-gray-500">
                    Maximum number of concurrent uses for this resource
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    className="w-full px-2 py-1.5 text-xs border rounded"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Financial Settings</span>
              <span title="Track resource costs including per-seize costs and time-based utilization costs">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <div className="space-y-1">
              {/* Enable Financial Tracking */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="financialEnabled"
                  checked={formData.financialProperties?.enabled || false}
                  onChange={(e) => handleFinancialChange("enabled", e.target.checked)}
                  className="w-3 h-3"
                />
                <label htmlFor="financialEnabled" className="text-xs font-medium text-gray-700">
                  Enable Financial Tracking
                </label>
              </div>

              {/* Cost Components */}
              <div className="space-y-0.5 pt-1">
                <div className="text-xs font-medium text-gray-600 mb-1">Cost Components</div>
                <div>
                  <label className="block text-xs text-gray-600">Cost Per Seize</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border rounded"
                    value={formData.financialProperties?.costPerSeize || 0}
                    onChange={(e) =>
                      handleFinancialChange("costPerSeize", parseFloat(e.target.value) || 0)
                    }
                    disabled={!formData.financialProperties?.enabled}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Fixed cost applied each time the resource is seized
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Cost Per Hour Utilized</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border rounded"
                    value={formData.financialProperties?.costPerHourUtilized || 0}
                    onChange={(e) =>
                      handleFinancialChange(
                        "costPerHourUtilized",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={!formData.financialProperties?.enabled}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Hourly cost while resource is being used
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Cost Per Hour Idle</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border rounded"
                    value={formData.financialProperties?.costPerHourIdle || 0}
                    onChange={(e) =>
                      handleFinancialChange("costPerHourIdle", parseFloat(e.target.value) || 0)
                    }
                    disabled={!formData.financialProperties?.enabled}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Hourly cost while resource has available capacity
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "states" && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Hash className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">State Definitions</span>
              <span title="Define custom state variables that this resource can track and modify">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.RESOURCE}
            />
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons - Only show for Basic and Finance tabs (States auto-save) */}
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

export default React.memo(ResourceEditor);
