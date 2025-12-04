import React from 'react';
import { SimulationObjectType, DiagramElementKind } from '@quodsi/shared';
import { MergedMapping } from '../../messaging/hooks/useConversionPreview';

interface ElementMappingRowProps {
    mapping: MergedMapping;
    onTypeChange: (newType: SimulationObjectType | null) => void;
    availableTypes: (SimulationObjectType | null)[];
}

/**
 * Compact card row for conversion preview
 * Shows element name/kind and type selector in a narrow layout
 */
export const ElementMappingRow: React.FC<ElementMappingRowProps> = ({
    mapping,
    onTypeChange,
    availableTypes
}) => {
    const formatType = (type: SimulationObjectType | null): string => {
        if (type === null) return 'Skip';
        // Shorten type names for compact display
        switch (type) {
            case SimulationObjectType.Generator: return 'Gen';
            case SimulationObjectType.Activity: return 'Act';
            case SimulationObjectType.Connector: return 'Conn';
            case SimulationObjectType.Resource: return 'Res';
            case SimulationObjectType.Entity: return 'Ent';
            default: return type;
        }
    };

    const formatTypeDropdown = (type: SimulationObjectType | null): string => {
        if (type === null) return 'Skip';
        return type;
    };

    /**
     * Get a friendly shape type from blockClassName
     * e.g., "ProcessBlock" → "Process", "TerminatorBlockV2" → "Terminator"
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
            .replace(/Block(V\d+)?$/i, '')  // ProcessBlock, TerminatorBlockV2 → Process, Terminator
            .replace(/Shape$/i, '')          // SomeShape → Some
            .replace(/([a-z])([A-Z])/g, '$1 $2'); // CamelCase → Camel Case

        return friendly || 'Block';
    };

    const getShapeBadgeClass = (): string => {
        if (mapping.elementKind === DiagramElementKind.LINE) {
            return 'bg-purple-50 text-purple-700';
        }
        return 'bg-blue-50 text-blue-700';
    };

    /**
     * Get connection info string like "2→1" (incoming→outgoing)
     */
    const getConnectionInfo = (): string | null => {
        if (mapping.elementKind === DiagramElementKind.LINE) {
            return null; // Lines don't have connection counts
        }

        const incoming = mapping.incomingCount ?? 0;
        const outgoing = mapping.outgoingCount ?? 0;

        // Only show if there are connections
        if (incoming === 0 && outgoing === 0) {
            return null;
        }

        return `${incoming}→${outgoing}`;
    };

    /**
     * Get dimensions string like "120×80"
     */
    const getDimensions = (): string | null => {
        if (mapping.elementKind === DiagramElementKind.LINE) {
            return null; // Lines don't have dimensions
        }

        if (mapping.width && mapping.height) {
            return `${mapping.width}×${mapping.height}`;
        }

        return null;
    };

    // Build the type hint showing transition
    const getTypeHint = (): string | null => {
        if (mapping.currentType && mapping.currentType !== mapping.proposedType) {
            // Re-conversion with type change
            return `${formatType(mapping.currentType)}→${formatType(mapping.proposedType)}`;
        }
        if (!mapping.currentType) {
            // New element being converted
            return 'New';
        }
        // Already converted, no change proposed
        return null;
    };

    const shapeType = getShapeType();
    const connectionInfo = getConnectionInfo();
    const dimensions = getDimensions();
    const typeHint = getTypeHint();

    return (
        <div className={`p-2 m-2 border border-gray-200 rounded ${mapping.hasOverride ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
            {/* Row 1: Name + Shape type badge + dimensions */}
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm truncate flex-1 mr-2" title={mapping.elementName}>
                    {mapping.elementName}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                        className={`px-1.5 py-0.5 text-xs rounded ${getShapeBadgeClass()}`}
                        title={mapping.blockClassName || mapping.elementKind}
                    >
                        {shapeType}
                    </span>
                    {dimensions && (
                        <span className="text-xs text-gray-400" title="Width × Height">
                            {dimensions}
                        </span>
                    )}
                    {mapping.lineLabel && (
                        <span className="text-xs text-gray-600 italic" title="Line label">
                            "{mapping.lineLabel}"
                        </span>
                    )}
                </div>
            </div>

            {/* Row 2: Type dropdown + connection info + type hint */}
            <div className="flex items-center gap-2">
                <select
                    value={mapping.finalType ?? 'null'}
                    onChange={(e) => {
                        const value = e.target.value;
                        onTypeChange(value === 'null' ? null : value as SimulationObjectType);
                    }}
                    className={`flex-1 px-2 py-1 text-sm border rounded ${mapping.hasOverride ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}
                >
                    {availableTypes.map(type => (
                        <option key={type ?? 'null'} value={type ?? 'null'}>
                            {formatTypeDropdown(type)}
                        </option>
                    ))}
                </select>
                {connectionInfo && (
                    <span className="text-xs text-gray-500 flex-shrink-0" title="Incoming → Outgoing connections">
                        {connectionInfo}
                    </span>
                )}
                {typeHint && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        {typeHint}
                    </span>
                )}
            </div>
        </div>
    );
};
