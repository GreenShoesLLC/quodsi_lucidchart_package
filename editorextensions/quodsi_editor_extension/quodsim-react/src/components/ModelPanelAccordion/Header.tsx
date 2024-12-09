import React from 'react';
import { AlertCircle } from "lucide-react";
import { ValidationState } from '@quodsi/shared';

interface HeaderProps {
    modelName: string;
    validationState: ValidationState | null;
    onValidate: () => void;
}

export const Header: React.FC<HeaderProps> = ({ modelName, validationState, onValidate }) => {
    const errorCount = validationState?.summary?.errorCount ?? 0;

    return (
        <div className="flex items-center justify-between p-3 border-b bg-white">
            <div className="flex items-center space-x-2">
                <h2 className="font-semibold text-sm truncate">
                    {modelName || "New Model"}
                </h2>
                {errorCount > 0 && (
                    <div className="flex items-center text-red-500 text-xs">
                        <AlertCircle size={14} className="mr-1" />
                        {errorCount}
                    </div>
                )}
            </div>
            <button
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={onValidate}
            >
                Validate
            </button>
        </div>
    );
};