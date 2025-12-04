import React, { useState } from 'react';
import { SimulationObjectType, DiagramElementKind } from '@quodsi/shared';
import { MergedMapping } from '../../messaging/hooks/useConversionPreview';
import { TypeToggleButtons, BLOCK_OVERRIDE_OPTIONS, LINE_OVERRIDE_OPTIONS } from './TypeToggleButtons';

interface OverridePanelProps {
    mapping: MergedMapping;
    onSave: (type: SimulationObjectType | null) => void;
    onCancel: () => void;
}

/**
 * Inline panel for overriding an item's type
 * Shows current type and allows selecting a new one
 */
export const OverridePanel: React.FC<OverridePanelProps> = ({
    mapping,
    onSave,
    onCancel
}) => {
    const [selectedType, setSelectedType] = useState<SimulationObjectType | null>(mapping.finalType);

    const getConnectionInfo = (): string => {
        if (mapping.incomingCount === 0 && mapping.outgoingCount === 0) {
            return '';
        }
        return ` (${mapping.incomingCount}→${mapping.outgoingCount})`;
    };

    const getCurrentTypeLabel = (): string => {
        if (mapping.finalType === null) return 'Skipped';
        return mapping.finalType;
    };

    // Use context-aware options
    const typeOptions = mapping.elementKind === DiagramElementKind.LINE
        ? LINE_OVERRIDE_OPTIONS
        : BLOCK_OVERRIDE_OPTIONS;

    return (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded m-1">
            {/* Header */}
            <div className="text-xs font-medium text-gray-700 mb-1 truncate" title={mapping.elementName}>
                Override: {mapping.elementName}
            </div>

            {/* Current type */}
            <div className="text-xs text-gray-500 mb-2">
                Currently: {getCurrentTypeLabel()}{getConnectionInfo()}
            </div>

            {/* Type selection */}
            <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">Change to:</div>
                <TypeToggleButtons
                    options={typeOptions}
                    selectedValue={selectedType}
                    onChange={setSelectedType}
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSave(selectedType)}
                    className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                >
                    Save
                </button>
            </div>
        </div>
    );
};
