import React from "react";
import { X } from "lucide-react";
import { QUODSI_VERSION, QUODSIM_VERSION, QUODSI_ICON_BASE64 } from "@quodsi/shared";
import { detectEnvironment } from "../../utils/environmentDetection";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AboutModal - Displays Quodsi version and environment information
 *
 * A simple modal dialog that shows the application name, current version,
 * and detected environment (Local/Dev/Test/Prod).
 * Triggered from the 3-dots menu in PanelHeader.
 */
export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const environment = detectEnvironment();

  // Handle backdrop click to close
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
      <div className="bg-white rounded-lg shadow-xl p-4 w-64">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-900">About Quodsi</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="text-center py-4">
          <img src={QUODSI_ICON_BASE64} alt="Quodsi" className="w-12 h-12 mx-auto mb-3" />
          <div className="text-lg font-bold text-gray-900">Quodsi</div>
          <div className="text-sm text-gray-600 mt-1">
            Discrete Event Simulation
          </div>
          <div className="text-xs text-gray-500 mt-3">
            App: {QUODSI_VERSION}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Simulation Engine: {QUODSIM_VERSION}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Environment: {environment}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-3 border-t">
          <a
            href="https://www.quodsi.com/earlyusers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Send us feedback
          </a>
          <div className="text-xs text-gray-400 mt-1">
            &copy; {new Date().getFullYear()} Quodsi
          </div>
        </div>
      </div>
    </div>
  );
};
