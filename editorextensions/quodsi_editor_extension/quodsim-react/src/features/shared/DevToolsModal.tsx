import React from "react";
import { X } from "lucide-react";

interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-4 w-96">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Developer Tools
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Empty state */}
        <div className="text-xs text-gray-500 text-center py-6">
          No tools available
        </div>
      </div>
    </div>
  );
};
