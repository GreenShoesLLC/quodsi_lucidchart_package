import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ModalSize, MODAL_SIZE_OPTIONS } from "@quodsi/lucid-shared";
import { getModalSizePref, setModalSizePref } from "../../lib/modalSizePref";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PreferencesModal - per-user UI preferences for the Quodsi panel.
 *
 * Currently exposes the embedded-modal size (Scenarios / Animation / Results).
 * The choice persists in localStorage via modalSizePref and is applied the next
 * time one of those windows is opened. Triggered from the 3-dots menu in
 * PanelHeader, mirroring AboutModal.
 */
export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const [size, setSize] = useState<ModalSize>(getModalSizePref());

  // Re-seed from the stored value each time the modal opens.
  useEffect(() => {
    if (isOpen) setSize(getModalSizePref());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ModalSize;
    setSize(next);
    setModalSizePref(next);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-4 w-72">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Preferences</h2>
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
          <label htmlFor="modal-size-pref" className="block text-xs font-medium text-gray-700 mb-1">
            Simulation window size
          </label>
          <select
            id="modal-size-pref"
            aria-label="Simulation window size"
            value={size}
            onChange={handleChange}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            {MODAL_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Controls the size of the Scenarios, Animation, and Results windows.
            Applies the next time you open one.
          </p>
        </div>
      </div>
    </div>
  );
};
