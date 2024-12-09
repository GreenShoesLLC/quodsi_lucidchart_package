import React from 'react';
import { ValidationMessage, ValidationMessageType } from "@quodsi/shared";

interface ValidationMessageListProps {
    messages: ValidationMessage[];
    currentElementId?: string;
}

export const ValidationMessageList: React.FC<ValidationMessageListProps> = ({ 
    messages, 
    currentElementId 
}) => {
    const getMessageStyle = (type: ValidationMessageType) => {
        switch(type) {
            case 'error':
                return 'bg-red-50 text-red-700';
            case 'warning':
                return 'bg-yellow-50 text-yellow-700';
            case 'info':
                return 'bg-blue-50 text-blue-700';
            default:
                return 'bg-gray-50 text-gray-700';
        }
    };

    const filteredMessages = currentElementId
        ? messages.filter(m => m.elementId === currentElementId)
        : messages;

    return (
        <div className="space-y-2">
            {filteredMessages.map((message, idx) => (
                <div
                    key={idx}
                    className={`p-2 rounded text-sm ${getMessageStyle(message.type)}`}
                >
                    {message.message}
                </div>
            ))}
        </div>
    );
};