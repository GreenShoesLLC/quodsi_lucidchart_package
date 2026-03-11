import React, { useState } from 'react';
import { useConversionPreview } from '../../messaging/hooks/useConversionPreview';
import { MappingTable } from './MappingTable';
import { AutoMappedSummary } from './AutoMappedSummary';

interface ConversionPreviewPanelProps {
    onRemoveModel?: () => void;
}

/**
 * Panel component that displays the diagram mapping as a table view
 * Shows all items (auto-mapped and unmapped) in a unified table with filtering
 */
export const ConversionPreviewPanel: React.FC<ConversionPreviewPanelProps> = ({
    onRemoveModel
}) => {
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const {
        isLoading,
        isApplying,
        error,
        previewData,
        mergedMappings,
        dynamicSummary,
        groupedAutoMapped,
        unmappedItems,
        closePreview,
        setOverride,
        applyConversion
    } = useConversionPreview();

    if (isLoading) {
        return (
            <div className="flex flex-col h-full p-4">
                <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading preview...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Diagram Mapping</h2>
                    <button
                        onClick={closePreview}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        X
                    </button>
                </div>
                <div className="flex items-center justify-center h-full">
                    <div className="text-red-500">Error: {error}</div>
                </div>
            </div>
        );
    }

    if (!previewData) {
        return null;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-gray-200">
                <h2 className="text-base font-semibold">Diagram Mapping</h2>
                <button
                    onClick={closePreview}
                    className="text-gray-500 hover:text-gray-700 text-lg"
                    title="Close"
                >
                    X
                </button>
            </div>

            {/* Auto-mapped summary */}
            <AutoMappedSummary
                grouped={groupedAutoMapped}
                hasUnmappedItems={unmappedItems.length > 0}
                swimlaneLaneCount={dynamicSummary.swimlaneLaneCount}
            />

            {/* Table content area */}
            <div className="flex-1 overflow-y-auto">
                <MappingTable
                    items={mergedMappings}
                    onTypeChange={setOverride}
                />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                    onClick={closePreview}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                    disabled={isApplying}
                >
                    Cancel
                </button>
                <button
                    onClick={applyConversion}
                    className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                    disabled={isApplying}
                >
                    {isApplying ? 'Applying...' : 'Apply'}
                </button>
            </div>

            {/* Danger Zone */}
            {onRemoveModel && (
                <div className="mx-2 mb-2 p-2 border-2 border-red-200 rounded bg-red-50">
                    <div className="text-xs font-medium text-red-700 mb-1">Danger Zone</div>
                    <p className="text-xs text-gray-600 mb-2">
                        Remove all Quodsi data from this page. This cannot be undone.
                    </p>
                    {!showRemoveConfirm ? (
                        <button
                            onClick={() => setShowRemoveConfirm(true)}
                            className="w-full px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 hover:bg-red-100 rounded transition-colors"
                        >
                            Remove Model
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-red-600 font-medium">
                                Are you sure? This will remove all simulation data from this page.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRemoveConfirm(false)}
                                    className="flex-1 px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onRemoveModel();
                                        setShowRemoveConfirm(false);
                                    }}
                                    className="flex-1 px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                                >
                                    Yes, Remove
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
