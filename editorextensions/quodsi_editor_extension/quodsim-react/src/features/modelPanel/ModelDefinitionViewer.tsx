import React, { useRef } from 'react';
import { X, MousePointerClick } from 'lucide-react';

interface ModelDefinitionViewerProps {
  modelJson: any;
  onClose: () => void;
}

/**
 * Modal component that displays the ModelDefinition as raw JSON
 * with select-all functionality for easy copying.
 */
export const ModelDefinitionViewer: React.FC<ModelDefinitionViewerProps> = ({
  modelJson,
  onClose
}) => {
  const jsonPreRef = useRef<HTMLPreElement>(null);

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

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {/* Action buttons and note */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
              >
                <MousePointerClick className="w-3 h-3" />
                Select All
              </button>
              <span className="text-xs text-gray-500 italic">
                This is the exact JSON payload sent to the simulation API. Use "Select All" then Ctrl+C to copy.
              </span>
            </div>

            {/* JSON Display */}
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[65vh]">
              <pre ref={jsonPreRef} className="text-xs font-mono whitespace-pre select-text">
                {JSON.stringify(modelJson, null, 2)}
              </pre>
            </div>
          </div>
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
