import React from "react";
import { X, AlertTriangle } from "lucide-react";

interface RemoveModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * RemoveModelModal - confirmation for unconverting a page ("Remove Quodsi Model").
 *
 * Triggered from the 3-dots menu in PanelHeader, mirroring AboutModal /
 * PreferencesModal.
 *
 * WHY THE WARNING IS SPECIFIC: removing does three things, not one.
 *   1. clears Quodsi data from the page and every shape (StorageAdapter.clearAllModelData)
 *   2. soft-deletes the model AND its studies/scenarios server-side
 *      (lucid_router.RemoveModel -> soft_delete_with_children)
 *   3. HARD-deletes the document's result blobs (ModelStore.delete_container)
 *
 * Step 3 is unrecoverable, and unlike drawio -- whose removal is a single
 * undoable graph edit -- Lucid's undo cannot bring any of it back. The API code
 * comments describe this as "intentional per the 'cannot be undone' Danger Zone
 * UX", referring to a confirmation that had been deleted from the UI (ClickUp
 * 86e2a5ff7). This dialog is that missing guard, so the copy names the losses
 * rather than saying a vague "are you sure".
 */
export const RemoveModelModal: React.FC<RemoveModelModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-model-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-4 w-80">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2
            id="remove-model-title"
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Remove Quodsi Model
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="py-1">
          <p className="text-xs text-gray-700 mb-2">
            This turns the page back into a plain diagram. It will remove:
          </p>
          <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1 mb-2">
            <li>Quodsi data on the page and every shape</li>
            <li>The model, along with its studies and scenarios</li>
            <li>
              <span className="font-medium">Simulation results, permanently</span>
            </li>
          </ul>
          <p className="text-xs text-red-600 font-medium mb-3">
            This cannot be undone.
          </p>

          {/* Actions — Cancel is the safe default and comes first */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Remove Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
