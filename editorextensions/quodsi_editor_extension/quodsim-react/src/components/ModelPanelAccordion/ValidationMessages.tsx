import React from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { ValidationMessage } from '@quodsi/shared';
import { ValidationMessageList } from './ValidationMessageList';

interface ValidationMessagesProps {
    validationState: {
        summary: {
            errorCount: number;
            warningCount: number;
        };
        messages: ValidationMessage[];
    } | null;
    currentElementId?: string;
    isExpanded: boolean;
    onToggle: () => void;
}

export const ValidationMessages: React.FC<ValidationMessagesProps> = ({
    validationState,
    currentElementId,
    isExpanded,
    onToggle
}) => {
    const errorCount = validationState?.summary?.errorCount ?? 0;
    const warningCount = validationState?.summary?.warningCount ?? 0;

    return (
        <div className="border-b">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
                <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">Validation</span>
                    {errorCount > 0 && (
                        <span className="flex items-center px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                            <AlertCircle size={12} className="mr-1" />
                            {errorCount} errors
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="flex items-center px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full ml-2">
                            <AlertCircle size={12} className="mr-1" />
                            {warningCount} warnings
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {isExpanded && validationState && (
                <div className="p-3 border-t">
                    {validationState.messages.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">
                            No validation issues found
                        </div>
                    ) : (
                        <ValidationMessageList
                            messages={validationState.messages}
                            currentElementId={currentElementId}
                        />
                    )}
                </div>
            )}
        </div>
    );
};