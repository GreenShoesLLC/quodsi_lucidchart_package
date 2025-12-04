import React from 'react';
import { SimulationObjectType, DiagramElementKind } from '@quodsi/shared';
import { MergedMapping } from '../../messaging/hooks/useConversionPreview';
import { TypeToggleButtons, UNMAPPED_TYPE_OPTIONS, LINE_OVERRIDE_OPTIONS } from './TypeToggleButtons';

interface UnmappedItemCardProps {
    mapping: MergedMapping;
    onTypeSelect: (type: SimulationObjectType | null) => void;
}

/**
 * Card for an unmapped (isolated) item
 * Shows element info and type selection buttons
 */
export const UnmappedItemCard: React.FC<UnmappedItemCardProps> = ({
    mapping,
    onTypeSelect
}) => {
    /**
     * Get a friendly shape type from blockClassName
     */
    const getShapeType = (): string => {
        if (mapping.elementKind === DiagramElementKind.LINE) {
            return 'Line';
        }

        const className = mapping.blockClassName;
        if (!className) {
            return 'Block';
        }

        // Strip common suffixes to get friendly name
        let friendly = className
            .replace(/Block(V\d+)?$/i, '')
            .replace(/Shape$/i, '')
            .replace(/([a-z])([A-Z])/g, '$1 $2');

        return friendly || 'Block';
    };

    const getShapeBadgeClass = (): string => {
        if (mapping.elementKind === DiagramElementKind.LINE) {
            return 'bg-purple-50 text-purple-700';
        }
        return 'bg-blue-50 text-blue-700';
    };

    const shapeType = getShapeType();

    // Use different options for lines vs blocks
    const typeOptions = mapping.elementKind === DiagramElementKind.LINE
        ? LINE_OVERRIDE_OPTIONS
        : UNMAPPED_TYPE_OPTIONS;

    return (
        <div className="p-2 border border-gray-200 rounded bg-white">
            {/* Row 1: Name + Shape type badge */}
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium truncate flex-1 mr-2" title={mapping.elementName}>
                    {mapping.elementName}
                </span>
                <span
                    className={`px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${getShapeBadgeClass()}`}
                    title={mapping.blockClassName || mapping.elementKind}
                >
                    {shapeType}
                </span>
            </div>

            {/* Row 2: Type selection buttons */}
            <TypeToggleButtons
                options={typeOptions}
                selectedValue={mapping.finalType}
                onChange={onTypeSelect}
            />
        </div>
    );
};
