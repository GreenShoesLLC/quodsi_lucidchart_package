import React, { useState, useRef } from 'react';
import { X, MousePointerClick } from 'lucide-react';

interface ModelDefinitionViewerProps {
  modelJson: any;
  onClose: () => void;
}

/**
 * Modal component that displays the ModelDefinition in two formats:
 * 1. Overview Tab - Visual summary with statistics
 * 2. JSON Tab - Raw JSON with select-all functionality
 */
export const ModelDefinitionViewer: React.FC<ModelDefinitionViewerProps> = ({
  modelJson,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const jsonPreRef = useRef<HTMLPreElement>(null);

  // Extract model information from JSON
  const model = modelJson?.model || {};
  const activities = modelJson?.activities || [];
  const entities = modelJson?.entities || [];
  const resources = modelJson?.resources || [];
  const generators = modelJson?.generators || [];
  const connectors = modelJson?.connectors || [];
  const states = modelJson?.states || [];

  // Handle select all JSON text
  const handleSelectAll = () => {
    if (jsonPreRef.current) {
      const range = document.createRange();
      range.selectNodeContents(jsonPreRef.current);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Render statistics cards for Overview tab
  const renderStatCard = (label: string, value: number, color: string) => (
    <div className={`p-4 rounded-lg border-l-4 ${color} bg-white shadow-sm`}>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );

  return (
    // Modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {/* Modal container */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Model Definition</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'json'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Model Metadata */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Model Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Name:</span>
                    <span className="ml-2 text-blue-900">{model.name || 'Unnamed Model'}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Version:</span>
                    <span className="ml-2 text-blue-900">{model.version || 'N/A'}</span>
                  </div>
                  {model.description && (
                    <div className="col-span-2">
                      <span className="text-blue-700 font-medium">Description:</span>
                      <span className="ml-2 text-blue-900">{model.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Component Counts */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Component Counts</h3>
                <div className="grid grid-cols-3 gap-4">
                  {renderStatCard('Activities', activities.length, 'border-green-500')}
                  {renderStatCard('Entities', entities.length, 'border-purple-500')}
                  {renderStatCard('Resources', resources.length, 'border-orange-500')}
                  {renderStatCard('Generators', generators.length, 'border-blue-500')}
                  {renderStatCard('Connectors', connectors.length, 'border-gray-500')}
                  {renderStatCard('States', states.length, 'border-indigo-500')}
                </div>
              </div>

              {/* Component Details Summary */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Component Details</h3>
                <div className="space-y-3 text-sm">
                  {activities.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Activities:</span>
                      <span className="ml-2 text-gray-600">
                        {activities.map((a: any) => a.name || 'Unnamed').join(', ')}
                      </span>
                    </div>
                  )}
                  {entities.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Entities:</span>
                      <span className="ml-2 text-gray-600">
                        {entities.map((e: any) => e.name || 'Unnamed').join(', ')}
                      </span>
                    </div>
                  )}
                  {resources.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Resources:</span>
                      <span className="ml-2 text-gray-600">
                        {resources.map((r: any) => r.name || 'Unnamed').join(', ')}
                      </span>
                    </div>
                  )}
                  {generators.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Generators:</span>
                      <span className="ml-2 text-gray-600">
                        {generators.map((g: any) => g.name || 'Unnamed').join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              {/* Action buttons */}
              <div className="flex justify-end">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
                >
                  <MousePointerClick className="w-4 h-4" />
                  Select All
                </button>
              </div>

              {/* JSON Display */}
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[60vh]">
                <pre ref={jsonPreRef} className="text-xs font-mono whitespace-pre select-text">
                  {JSON.stringify(modelJson, null, 2)}
                </pre>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="italic">
                  <strong>Note:</strong> This is the exact JSON payload sent to the simulation API.
                </p>
                <p className="italic">
                  <strong>Tip:</strong> Use "Select All" to highlight all JSON text, then use Ctrl+C (or Cmd+C) to copy.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
