import React, { useState, useMemo } from 'react';
import { SimulationObjectType } from '@quodsi/shared';
import { MergedMapping } from '../../messaging/hooks/useConversionPreview';
import { StatusBadge, computeStatus, MappingStatus } from './StatusBadge';
import { TypeDropdown } from './TypeDropdown';

interface MappingTableProps {
    items: MergedMapping[];
    onTypeChange: (elementId: string, type: SimulationObjectType | null) => void;
}

type StatusFilterValue = 'all' | MappingStatus;
type TypeFilterValue = 'all' | SimulationObjectType | 'skip';

const statusFilterOptions: { value: StatusFilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'not_mapped', label: 'None' },
    { value: 'quodsi_mapped', label: 'Quodsi' },
    { value: 'user_mapped', label: 'User' }
];

const typeFilterOptions: { value: TypeFilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: SimulationObjectType.Generator, label: 'Generator' },
    { value: SimulationObjectType.Activity, label: 'Activity' },
    { value: SimulationObjectType.Resource, label: 'Resource' },
    { value: SimulationObjectType.Entity, label: 'Entity' },
    { value: SimulationObjectType.Connector, label: 'Connector' },
    { value: 'skip', label: '(skip)' }
];

export const MappingTable: React.FC<MappingTableProps> = ({
    items,
    onTypeChange
}) => {
    const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');

    // Filter items based on both status and type filters
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Status filter
            if (statusFilter !== 'all') {
                const status = computeStatus(item.finalType, item.hasOverride);
                if (status !== statusFilter) return false;
            }
            // Type filter
            if (typeFilter !== 'all') {
                if (typeFilter === 'skip') {
                    if (item.finalType !== null) return false;
                } else {
                    if (item.finalType !== typeFilter) return false;
                }
            }
            return true;
        });
    }, [items, statusFilter, typeFilter]);

    // Count for status filter display
    const statusFilterCounts = useMemo(() => {
        const counts: Record<StatusFilterValue, number> = {
            all: items.length,
            not_mapped: 0,
            quodsi_mapped: 0,
            user_mapped: 0
        };
        items.forEach(item => {
            const status = computeStatus(item.finalType, item.hasOverride);
            counts[status]++;
        });
        return counts;
    }, [items]);

    // Count for type filter display
    const typeFilterCounts = useMemo(() => {
        const counts: { [key: string]: number } = {
            all: items.length,
            [SimulationObjectType.Generator]: 0,
            [SimulationObjectType.Activity]: 0,
            [SimulationObjectType.Resource]: 0,
            [SimulationObjectType.Entity]: 0,
            [SimulationObjectType.Connector]: 0,
            skip: 0
        };
        items.forEach(item => {
            if (item.finalType === null) {
                counts.skip++;
            } else if (item.finalType in counts) {
                counts[item.finalType]++;
            }
        });
        return counts;
    }, [items]);

    return (
        <div className="flex flex-col h-full">
            {/* Table */}
            <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-1 font-medium text-gray-700 w-[70px]">
                            Name
                        </th>
                        <th className="text-left py-2 px-1 font-medium text-gray-700">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as TypeFilterValue)}
                                className="bg-transparent border-none text-xs font-medium text-gray-700 cursor-pointer hover:text-blue-600 focus:outline-none"
                                title="Filter by type"
                            >
                                {typeFilterOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label} ({typeFilterCounts[opt.value]})
                                    </option>
                                ))}
                            </select>
                        </th>
                        <th className="text-left py-2 px-1 font-medium text-gray-700 w-[60px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
                                className="bg-transparent border-none text-xs font-medium text-gray-700 cursor-pointer hover:text-blue-600 focus:outline-none"
                                title="Filter by status"
                            >
                                {statusFilterOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label} ({statusFilterCounts[opt.value]})
                                    </option>
                                ))}
                            </select>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredItems.map((item) => {
                        const status = computeStatus(item.finalType, item.hasOverride);
                        return (
                            <tr
                                key={item.elementId}
                                className="border-b border-gray-100 hover:bg-gray-50"
                            >
                                <td className="py-1.5 px-1 text-gray-800 truncate max-w-[70px]" title={item.elementName}>
                                    {item.elementName || '(unnamed)'}
                                </td>
                                <td className="py-1.5 px-1">
                                    <TypeDropdown
                                        currentType={item.finalType}
                                        elementKind={item.elementKind}
                                        onChange={(type) => onTypeChange(item.elementId, type)}
                                    />
                                </td>
                                <td className="py-1.5 px-1 w-[60px]">
                                    <StatusBadge status={status} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Empty state */}
            {filteredItems.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-8 text-gray-400 text-sm">
                    {statusFilter === 'all' && typeFilter === 'all'
                        ? 'No items to map'
                        : 'No matching items'
                    }
                </div>
            )}
        </div>
    );
};
