import React from 'react';
import { SimulationObjectType } from '@quodsi/shared';

export interface TypeOption {
    value: SimulationObjectType | null;
    label: string;
    shortLabel?: string;
}

interface TypeToggleButtonsProps {
    options: TypeOption[];
    selectedValue: SimulationObjectType | null;
    onChange: (value: SimulationObjectType | null) => void;
    size?: 'sm' | 'md';
}

/**
 * Reusable toggle button group for selecting simulation types
 * Shows horizontal buttons with the selected one highlighted
 */
export const TypeToggleButtons: React.FC<TypeToggleButtonsProps> = ({
    options,
    selectedValue,
    onChange,
    size = 'sm'
}) => {
    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-xs'
        : 'px-3 py-1 text-sm';

    return (
        <div className="flex gap-1 flex-wrap">
            {options.map(option => {
                const isSelected = option.value === selectedValue;
                return (
                    <button
                        key={option.value ?? 'null'}
                        onClick={() => onChange(option.value)}
                        className={`${sizeClasses} rounded border transition-colors ${
                            isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        title={option.label}
                    >
                        {option.shortLabel ?? option.label}
                    </button>
                );
            })}
        </div>
    );
};

/**
 * Predefined type options for unmapped items (isolated blocks)
 */
export const UNMAPPED_TYPE_OPTIONS: TypeOption[] = [
    { value: SimulationObjectType.Resource, label: 'Resource', shortLabel: 'Resource' },
    { value: SimulationObjectType.Entity, label: 'Entity', shortLabel: 'Entity' },
    { value: null, label: 'Skip', shortLabel: 'Skip' }
];

/**
 * Predefined type options for overriding blocks
 */
export const BLOCK_OVERRIDE_OPTIONS: TypeOption[] = [
    { value: SimulationObjectType.Generator, label: 'Generator', shortLabel: 'Gen' },
    { value: SimulationObjectType.Activity, label: 'Activity', shortLabel: 'Act' },
    { value: SimulationObjectType.Resource, label: 'Resource', shortLabel: 'Res' },
    { value: SimulationObjectType.Entity, label: 'Entity', shortLabel: 'Ent' },
    { value: null, label: 'Skip', shortLabel: 'Skip' }
];

/**
 * Predefined type options for overriding lines
 */
export const LINE_OVERRIDE_OPTIONS: TypeOption[] = [
    { value: SimulationObjectType.Connector, label: 'Connector', shortLabel: 'Connector' },
    { value: null, label: 'Skip', shortLabel: 'Skip' }
];
