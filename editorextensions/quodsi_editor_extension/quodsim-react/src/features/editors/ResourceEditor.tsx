import React from "react";
import { Settings, DollarSign, Hash } from "lucide-react";
import {
  Resource,
  SimulationObjectType,
  ResourceFinancialProperties,
} from "@quodsi/shared";
import BaseEditor from "./BaseEditor";

interface Props {
  resource: Resource;
  onSave: (resource: Resource) => void;
  onCancel: () => void;
}

type ResourceTab = "basic" | "finance" | "states";

const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = React.useState<ResourceTab>("basic");

  // Extract and prepare resource data
  const extractResourceData = (res: any): Resource => {
    const data = res.data || res;
    const resource = new Resource(
      data.id || "",
      data.name || "New Resource",
      data.capacity || 1,
      data.x || 0,
      data.y || 0
    );

    // Initialize financialProperties if it doesn't exist
    resource.financialProperties = data.financialProperties
      ? ResourceFinancialProperties.fromJSON(data.financialProperties)
      : new ResourceFinancialProperties();

    return resource;
  };

  const extractedResource = React.useMemo(() => extractResourceData(resource), [resource]);

  // Handler for financial property changes
  const handleFinancialChange = (
    field: keyof ResourceFinancialProperties,
    value: any,
    localData: Resource,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    const currentFinancial =
      localData.financialProperties || new ResourceFinancialProperties();
    const updatedFinancial = new ResourceFinancialProperties({
      enabled: currentFinancial.enabled,
      costPerSeize: currentFinancial.costPerSeize,
      costPerHourUtilized: currentFinancial.costPerHourUtilized,
      costPerHourIdle: currentFinancial.costPerHourIdle,
      [field]: value,
    });

    handleChange({
      target: {
        name: "financialProperties",
        value: updatedFinancial,
      },
    } as any);
  };

  return (
    <BaseEditor
      data={{
        ...extractedResource,
        type: SimulationObjectType.Resource,
        // Ensure all Resource methods are available
        setLocation: (x: number, y: number) => extractedResource.setLocation(x, y),
        getLocation: () => extractedResource.getLocation(),
        hasLocation: () => extractedResource.hasLocation(),
        clone: () => extractedResource.clone(),
        resetLocation: () => extractedResource.resetLocation(),
        toJSON: () => extractedResource.toJSON(),
      }}
      onSave={(updatedData) => {
        // Create a new Resource instance to preserve class methods
        const updatedResource = new Resource(
          updatedData.id,
          updatedData.name,
          updatedData.capacity,
          updatedData.x,
          updatedData.y
        );

        // Preserve financialProperties
        updatedResource.financialProperties = updatedData.financialProperties;

        onSave(updatedResource);
      }}
      onCancel={onCancel}
      messageType="resourceSaved"
    >
      {(localResource, handleChange) => (
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
                      Resource Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      value={localResource.name}
                      onChange={handleChange}
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
                        value={localResource.capacity}
                        onChange={handleChange}
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
                </div>
                <div className="space-y-2">
                  {/* Enable Financial Tracking */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="financialEnabled"
                      checked={localResource.financialProperties?.enabled || false}
                      onChange={(e) =>
                        handleFinancialChange(
                          "enabled",
                          e.target.checked,
                          localResource,
                          handleChange
                        )
                      }
                      className="w-3 h-3"
                    />
                    <label htmlFor="financialEnabled" className="text-xs font-medium text-gray-700">
                      Enable Financial Tracking
                    </label>
                  </div>

                  {/* Cost Components */}
                  <div className="space-y-1 pt-1">
                    <div className="text-xs font-medium text-gray-600 mb-1">Cost Components</div>
                    <div>
                      <label className="block text-xs text-gray-600">Cost Per Seize</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localResource.financialProperties?.costPerSeize || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerSeize",
                            parseFloat(e.target.value) || 0,
                            localResource,
                            handleChange
                          )
                        }
                        disabled={!localResource.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Fixed cost applied each time the resource is seized
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Cost Per Hour Utilized</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localResource.financialProperties?.costPerHourUtilized || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourUtilized",
                            parseFloat(e.target.value) || 0,
                            localResource,
                            handleChange
                          )
                        }
                        disabled={!localResource.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hourly cost while resource is being used
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Cost Per Hour Idle</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localResource.financialProperties?.costPerHourIdle || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourIdle",
                            parseFloat(e.target.value) || 0,
                            localResource,
                            handleChange
                          )
                        }
                        disabled={!localResource.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hourly cost while resource has available capacity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "states" && (
              <div className="p-4 text-center text-gray-500">
                <p className="text-xs">State management coming soon</p>
              </div>
            )}
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(ResourceEditor);
