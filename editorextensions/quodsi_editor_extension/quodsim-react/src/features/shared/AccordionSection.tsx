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
    <div className="border-b">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
        aria-expanded={isExpanded}
      >
        <span className="font-medium text-sm">{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && <div className="p-3 border-t">{children}</div>}
    </div>
  );
};
