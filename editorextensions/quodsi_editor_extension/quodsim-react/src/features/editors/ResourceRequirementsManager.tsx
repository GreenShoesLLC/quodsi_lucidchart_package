import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ResourceRequirement } from '@quodsi/shared';
import { convertRootClausesToStructure, generatePreview } from '../../utils/resourceRequirementConverter';

interface ResourceRequirementsManagerProps {
  requirements: ResourceRequirement[];
  availableResources: Array<{ id: string; name: string }>;
  onAdd: () => void;
  onEdit: (requirement: ResourceRequirement) => void;
  onDelete: (id: string) => void;
  getUsageCount: (id: string) => number;
}

export const ResourceRequirementsManager: React.FC<ResourceRequirementsManagerProps> = ({
  requirements,
  availableResources,
  onAdd,
  onEdit,
  onDelete,
  getUsageCount
}) => {
  
  const handleDelete = (req: ResourceRequirement) => {
    const usageCount = getUsageCount(req.id);

    if (usageCount > 0) {
      const confirmed = window.confirm(
        `This requirement is used by ${usageCount} Operation Step${usageCount !== 1 ? 's' : ''}. ` +
        `Deleting it will remove the resource assignment from those steps. Are you sure?`
      );
      if (!confirmed) return;
    }

    onDelete(req.id);
  };

  const isAutoRequirement = (req: ResourceRequirement): boolean => {
    return availableResources.some(r => r.id === req.id);
  };

  const getResourceName = (id: string): string => {
    return availableResources.find(r => r.id === id)?.name || 'Unknown';
  };

  const generateRequirementPreview = (req: ResourceRequirement): string => {
    const structure = convertRootClausesToStructure(req.rootClauses);
    return generatePreview(structure, getResourceName);
  };

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Resource Requirements</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Define reusable resource requirements for operation steps
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs font-medium"
        >
          <Plus size={14} />
          Add New
        </button>
      </div>

      <div className="space-y-1.5">
        {requirements.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-500 mb-2">No resource requirements defined yet</p>
            <p className="text-xs text-gray-400">Click "Add New" to create your first requirement</p>
          </div>
        ) : (
          requirements.map(req => {
            const usageCount = getUsageCount(req.id);

            return (
              <div
                key={req.id}
                className="p-2 bg-white border border-gray-200 rounded hover:border-blue-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{req.name}</h4>
                      {isAutoRequirement(req) && (
                        <span
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex-shrink-0"
                          title="Auto-generated from Resource. Delete the Resource to remove."
                        >
                          Auto
                        </span>
                      )}
                      {usageCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex-shrink-0">
                          {usageCount} step{usageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-0.5">
                      {generateRequirementPreview(req)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {req.rootClauses[0]?.subClauses?.length > 0
                        ? `${req.rootClauses[0].subClauses.length + (req.rootClauses[0].requests.length > 0 ? 1 : 0)} team options`
                        : '1 team option'
                      } • {req.rootClauses[0]?.mode === 'REQUIRE_ANY' ? 'Pick one' : 'Need all'}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => onEdit(req)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit requirement"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!isAutoRequirement(req) && (
                      <button
                        onClick={() => handleDelete(req)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Delete requirement"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
