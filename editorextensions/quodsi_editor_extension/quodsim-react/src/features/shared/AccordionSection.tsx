import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * Reusable accordion section component that provides consistent styling
 * and behavior for expandable/collapsible sections
 */
export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className="border-b border-gray-200 bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50"
        aria-expanded={isExpanded}
      >
        <span className="font-medium text-sm text-gray-700">{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && <div className="p-4 border-t border-gray-200 bg-white max-h-[500px] overflow-auto">{children}</div>}
    </div>
  );
};
