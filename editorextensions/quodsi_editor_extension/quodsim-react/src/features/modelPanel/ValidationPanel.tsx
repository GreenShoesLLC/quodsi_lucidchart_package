import React from 'react';
import { ValidationState, ValidationMessage } from '@quodsi/shared';
import { AccordionSection } from '../shared/AccordionSection';
import { AlertTriangle, XCircle, Info } from 'lucide-react';

interface ValidationPanelProps {
  validationState: ValidationState | null;
  currentElementId?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * ValidationPanel component that displays validation messages for the model or selected element
 */
export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationState,
  currentElementId,
  isExpanded,
  onToggle
}) => {
  // Helper to get a summary of validation issues
  const getValidationSummary = (): string => {
    if (!validationState) return 'No validation results';
    
    const { errorCount, warningCount } = validationState.summary;
    
    if (errorCount === 0 && warningCount === 0) {
      return 'No validation issues';
    }
    
    const errorText = errorCount > 0 ? `${errorCount} error${errorCount !== 1 ? 's' : ''}` : '';
    const warningText = warningCount > 0 ? `${warningCount} warning${warningCount !== 1 ? 's' : ''}` : '';
    
    if (errorCount > 0 && warningCount > 0) {
      return `${errorText} and ${warningText}`;
    }
    
    return errorText || warningText;
  };

  // Filter messages based on currentElementId if provided
  const getFilteredMessages = (): ValidationMessage[] => {
    if (!validationState?.messages) return [];
    
    if (currentElementId) {
      return validationState.messages.filter(
        message => message.elementId === currentElementId || !message.elementId
      );
    }
    
    return validationState.messages;
  };

  // Render validation message
  const renderValidationMessage = (message: ValidationMessage, index: number) => {
    const getMessageStyle = (type: string) => {
      switch (type.toLowerCase()) {
        case "error":
          return {
            container: "bg-red-50 border-l-4 border-red-500 p-4 mb-3 rounded-r-md",
            icon: <XCircle className="h-5 w-5 text-red-500" />,
            text: "text-red-700 font-medium",
          };
        case "warning":
          return {
            container: "bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-3 rounded-r-md",
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            text: "text-yellow-700 font-medium",
          };
        default:
          return {
            container: "bg-blue-50 border-l-4 border-blue-500 p-4 mb-3 rounded-r-md",
            icon: <Info className="h-5 w-5 text-blue-500" />,
            text: "text-blue-700 font-medium",
          };
      }
    };

    const style = getMessageStyle(message.type);

    return (
      <div key={`validation-${index}`} className={`${style.container} shadow-sm`}>
        <div className="flex">
          <div className="flex-shrink-0">{style.icon}</div>
          <div className="ml-3 flex-1">
            <p className={`text-sm ${style.text} leading-5`}>{message.message}</p>
            {message.elementId && (
              <p className="text-xs text-gray-500 mt-1">Element ID: {message.elementId}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Filter the messages to show
  const filteredMessages = getFilteredMessages();
  const validationSummary = getValidationSummary();

  return (
    <AccordionSection
      title={`Validation (${validationSummary})`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {filteredMessages.length === 0 ? (
        <div className="flex items-center justify-center p-6 text-center">
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 inline-block">
            <div className="text-green-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700">
              No validation issues found for the current selection.
            </p>
          </div>
        </div>
      ) : (
        <div className="validation-message-list px-1 py-2">
          {filteredMessages.map((message, index) => 
            renderValidationMessage(message, index)
          )}
        </div>
      )}
    </AccordionSection>
  );
};
