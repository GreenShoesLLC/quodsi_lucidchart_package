import React from 'react';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { GroupedAutoMapped, MergedMapping } from '../../messaging/hooks/useConversionPreview';
import { OverridePanel } from './OverridePanel';

interface AutoMappedDetailsProps {
    grouped: GroupedAutoMapped;
    editingId: string | null;
    onEditClick: (elementId: string | null) => void;
    onOverride: (elementId: string, type: SimulationObjectType | null) => void;
}

interface ItemRowProps {
    mapping: MergedMapping;
    isEditing: boolean;
    onEditClick: () => void;
    onOverride: (type: SimulationObjectType | null) => void;
    onCancelEdit: () => void;
}

const MAX_VISIBLE_ITEMS = 5;

/**
 * Single item row in the details section
 */
const ItemRow: React.FC<ItemRowProps> = ({
    mapping,
    isEditing,
    onEditClick,
    onOverride,
    onCancelEdit
}) => {
    const getConnectionInfo = (): string | null => {
        if (mapping.incomingCount === 0 && mapping.outgoingCount === 0) {
            return null;
        }
        return `${mapping.incomingCount}→${mapping.outgoingCount}`;
    };

    const connectionInfo = getConnectionInfo();

    if (isEditing) {
        return (
            <OverridePanel
                mapping={mapping}
                onSave={onOverride}
                onCancel={onCancelEdit}
            />
        );
    }

    return (
        <div className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
            <span className="text-xs truncate flex-1" title={mapping.elementName}>
                {mapping.elementName}
            </span>
            {connectionInfo && (
                <span className="text-xs text-gray-400 mx-2" title="Incoming → Outgoing">
                    {connectionInfo}
                </span>
            )}
            {mapping.lineLabel && (
                <span className="text-xs text-gray-500 italic mx-1" title="Line label">
                    "{mapping.lineLabel}"
                </span>
            )}
            {mapping.hasOverride && (
                <span className="text-xs text-yellow-600 mx-1" title="User override applied">
                    *
                </span>
            )}
            <button
                onClick={onEditClick}
                className="text-xs text-gray-400 hover:text-gray-600 px-1"
                title="Override type"
            >
                ✎
            </button>
        </div>
    );
};

/**
 * Section for a group of items (Generators, Activities, etc.)
 */
interface GroupSectionProps {
    title: string;
    subtitle?: string;
    items: MergedMapping[];
    editingId: string | null;
    onEditClick: (elementId: string | null) => void;
    onOverride: (elementId: string, type: SimulationObjectType | null) => void;
}

const GroupSection: React.FC<GroupSectionProps> = ({
    title,
    subtitle,
    items,
    editingId,
    onEditClick,
    onOverride
}) => {
    const [expanded, setExpanded] = React.useState(false);

    if (items.length === 0) {
        return null;
    }

    const visibleItems = expanded ? items : items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
        <div className="mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">
                {title} ({items.length})
                {subtitle && <span className="font-normal normal-case ml-1">{subtitle}</span>}
            </div>
            <div className="bg-gray-50 rounded border border-gray-100">
                {visibleItems.map(mapping => (
                    <ItemRow
                        key={mapping.elementId}
                        mapping={mapping}
                        isEditing={editingId === mapping.elementId}
                        onEditClick={() => onEditClick(mapping.elementId)}
                        onOverride={(type) => {
                            onOverride(mapping.elementId, type);
                            onEditClick(null);
                        }}
                        onCancelEdit={() => onEditClick(null)}
                    />
                ))}
                {!expanded && hiddenCount > 0 && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                    >
                        ({hiddenCount} more...)
                    </button>
                )}
                {expanded && items.length > MAX_VISIBLE_ITEMS && (
                    <button
                        onClick={() => setExpanded(false)}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                    >
                        (show less)
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Expandable section showing all auto-mapped items grouped by type
 */
export const AutoMappedDetails: React.FC<AutoMappedDetailsProps> = ({
    grouped,
    editingId,
    onEditClick,
    onOverride
}) => {
    return (
        <div className="px-2 pb-2">
            <GroupSection
                title="Generators"
                subtitle="(0→N)"
                items={grouped.generators}
                editingId={editingId}
                onEditClick={onEditClick}
                onOverride={onOverride}
            />
            <GroupSection
                title="Activities"
                items={grouped.activities}
                editingId={editingId}
                onEditClick={onEditClick}
                onOverride={onOverride}
            />
            <GroupSection
                title="Connectors"
                items={grouped.connectors}
                editingId={editingId}
                onEditClick={onEditClick}
                onOverride={onOverride}
            />
            <GroupSection
                title="Skipped"
                subtitle="(disconnected)"
                items={grouped.skipped}
                editingId={editingId}
                onEditClick={onEditClick}
                onOverride={onOverride}
            />
        </div>
    );
};
