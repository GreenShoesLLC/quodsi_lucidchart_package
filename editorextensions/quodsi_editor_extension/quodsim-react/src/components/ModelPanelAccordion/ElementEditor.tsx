import React from 'react';
import { ChevronDown, ChevronRight } from "lucide-react";
import { SimulationObjectType } from "@quodsi/shared";

interface ElementEditorProps {
    elementData: any;
    elementType: SimulationObjectType;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate: (elementId: string, data: any) => void;
}

export const ElementEditor: React.FC<ElementEditorProps> = ({
    elementData,
    elementType,
    isExpanded,
    onToggle,
    onUpdate,
}) => {
    const handleInputChange = (key: string, value: any) => {
        onUpdate(elementData.id, {
            ...elementData,
            [key]: value
        });
    };

    return (
        <div className="border-b">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
                <span className="font-medium text-sm">
                    {elementData ? `Edit ${elementType}` : 'Element Editor'}
                </span>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {isExpanded && elementData && (
                <div className="p-3 border-t">
                    <div className="space-y-3">
                        {/* Common fields for all element types */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={elementData.name || ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full p-1 text-sm border rounded"
                            />
                        </div>

                        {/* Element type specific fields */}
                        {elementType === SimulationObjectType.Activity && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Capacity
                                    </label>
                                    <input
                                        type="number"
                                        value={elementData.capacity || 1}
                                        onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                                        className="w-full p-1 text-sm border rounded"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Input Buffer Capacity
                                    </label>
                                    <input
                                        type="number"
                                        value={elementData.inputBufferCapacity || 0}
                                        onChange={(e) => handleInputChange('inputBufferCapacity', parseInt(e.target.value))}
                                        className="w-full p-1 text-sm border rounded"
                                        min="0"
                                    />
                                </div>
                            </>
                        )}

                        {elementType === SimulationObjectType.Resource && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Resource Capacity
                                </label>
                                <input
                                    type="number"
                                    value={elementData.capacity || 1}
                                    onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                                    className="w-full p-1 text-sm border rounded"
                                    min="1"
                                />
                            </div>
                        )}

                        {elementType === SimulationObjectType.Generator && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Entities Per Creation
                                    </label>
                                    <input
                                        type="number"
                                        value={elementData.entitiesPerCreation || 1}
                                        onChange={(e) => handleInputChange('entitiesPerCreation', parseInt(e.target.value))}
                                        className="w-full p-1 text-sm border rounded"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Maximum Entities
                                    </label>
                                    <input
                                        type="number"
                                        value={elementData.maxEntities || Infinity}
                                        onChange={(e) => handleInputChange('maxEntities', parseInt(e.target.value))}
                                        className="w-full p-1 text-sm border rounded"
                                        min="1"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};