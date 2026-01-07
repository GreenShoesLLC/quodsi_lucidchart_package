import React from 'react';
import { SimulationObjectType, DiagramElementKind } from '@quodsi/shared';

interface TypeDropdownProps {
    currentType: SimulationObjectType | null;
    elementKind: DiagramElementKind;
    onChange: (type: SimulationObjectType | null) => void;
}

/**
 * Get display label for a simulation type
 */
function getTypeLabel(type: SimulationObjectType | null): string {
    if (type === null) {
        return '(skip)';
    }
    return type;
}

/**
 * Get available types based on element kind
 */
function getAvailableTypes(elementKind: DiagramElementKind): (SimulationObjectType | null)[] {
    if (elementKind === DiagramElementKind.LINE) {
        return [SimulationObjectType.Connector, null];
    }
    return [
        SimulationObjectType.Generator,
        SimulationObjectType.Activity,
        SimulationObjectType.Resource,
        SimulationObjectType.Entity,
        null
    ];
}

export const TypeDropdown: React.FC<TypeDropdownProps> = ({
    currentType,
    elementKind,
    onChange
}) => {
    const availableTypes = getAvailableTypes(elementKind);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === '__null__') {
            onChange(null);
        } else {
            onChange(value as SimulationObjectType);
        }
    };

    return (
        <select
            value={currentType ?? '__null__'}
            onChange={handleChange}
            className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
            {availableTypes.map((type) => (
                <option key={type ?? '__null__'} value={type ?? '__null__'}>
                    {getTypeLabel(type)}
                </option>
            ))}
        </select>
    );
};
