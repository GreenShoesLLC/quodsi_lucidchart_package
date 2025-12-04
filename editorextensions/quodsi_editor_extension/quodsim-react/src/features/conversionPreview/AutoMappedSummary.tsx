import React from 'react';
import { GroupedAutoMapped } from '../../messaging/hooks/useConversionPreview';

interface AutoMappedSummaryProps {
    grouped: GroupedAutoMapped;
    hasUnmappedItems: boolean;
}

/**
 * Summary card showing auto-mapped element counts
 * Displays a success state when all items are mapped
 */
export const AutoMappedSummary: React.FC<AutoMappedSummaryProps> = ({
    grouped,
    hasUnmappedItems
}) => {
    const totalAutoMapped =
        grouped.generators.length +
        grouped.activities.length +
        grouped.connectors.length +
        grouped.skipped.length;

    const title = hasUnmappedItems
        ? `Auto-mapped: ${totalAutoMapped} items`
        : 'Ready to convert';

    return (
        <div className="m-2 p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 text-sm font-medium">
                    {title}
                </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                {grouped.generators.length > 0 && (
                    <span>
                        {grouped.generators.length} Generator{grouped.generators.length !== 1 ? 's' : ''}
                        <span className="text-gray-400 ml-1">(sources)</span>
                    </span>
                )}
                {grouped.activities.length > 0 && (
                    <span>
                        {grouped.activities.length} Activit{grouped.activities.length !== 1 ? 'ies' : 'y'}
                        <span className="text-gray-400 ml-1">(processes)</span>
                    </span>
                )}
                {grouped.connectors.length > 0 && (
                    <span>
                        {grouped.connectors.length} Connector{grouped.connectors.length !== 1 ? 's' : ''}
                        <span className="text-gray-400 ml-1">(flow)</span>
                    </span>
                )}
                {grouped.skipped.length > 0 && (
                    <span className="text-gray-400">
                        {grouped.skipped.length} Skipped
                    </span>
                )}
            </div>
        </div>
    );
};
