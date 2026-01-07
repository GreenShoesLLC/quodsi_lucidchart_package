import React from 'react';

export type MappingStatus = 'not_mapped' | 'quodsi_mapped' | 'user_mapped';

interface StatusBadgeProps {
    status: MappingStatus;
}

const statusConfig: Record<MappingStatus, { label: string; className: string }> = {
    not_mapped: {
        label: 'None',
        className: 'bg-gray-100 text-gray-500 italic'
    },
    quodsi_mapped: {
        label: 'Quodsi',
        className: 'bg-green-100 text-green-700'
    },
    user_mapped: {
        label: 'User',
        className: 'bg-blue-100 text-blue-700'
    }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config = statusConfig[status];

    return (
        <span className={`px-1.5 py-0.5 text-xs rounded ${config.className}`}>
            {config.label}
        </span>
    );
};

/**
 * Helper to compute status from mapping data
 */
export function computeStatus(
    finalType: unknown | null,
    hasOverride: boolean
): MappingStatus {
    if (finalType === null) {
        return 'not_mapped';
    }
    if (hasOverride) {
        return 'user_mapped';
    }
    return 'quodsi_mapped';
}
