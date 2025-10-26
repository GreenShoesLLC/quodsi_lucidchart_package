import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
  const [deletingRequirement, setDeletingRequirement] = useState<ResourceRequirement | null>(null);
  
  const handleDelete = (req: ResourceRequirement) => {
    setDeletingRequirement(req);
  };

  const confirmDelete = () => {
    if (deletingRequirement) {
      onDelete(deletingRequirement.id);
      setDeletingRequirement(null);
    }
  };

  const cancelDelete = () => {
    setDeletingRequirement(null);
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
        <h3 className="text-sm font-semibold text-gray-900">Resource Requirements</h3>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs font-medium"
        >
          <Plus size={14} />
          Add New
        </button>
      </div>

      {/* Delete Confirmation */}
      {deletingRequirement && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-sm font-medium text-red-900 mb-2">
            Delete Requirement: "{deletingRequirement.name}"?
          </div>
          {(() => {
            const usageCount = getUsageCount(deletingRequirement.id);
            return usageCount > 0 ? (
              <div className="text-sm text-red-700 mb-2">
                ⚠️ This requirement is currently used by {usageCount} Operation Step{usageCount !== 1 ? 's' : ''}.
              </div>
            ) : null;
          })()}
          <div className="text-xs text-red-600 mb-2">
            ⚠️ Warning: This requirement may be referenced in:
          </div>
          <ul className="text-xs text-red-600 ml-4 mb-2 list-disc">
            <li>Activity operation steps</li>
          </ul>
          <div className="text-xs text-red-700 mb-3">
            These references will be automatically cleared.
            This action cannot be undone.
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Requirement
            </button>
            <button
              onClick={cancelDelete}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit requirement"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {!isAutoRequirement(req) && (
                      <button
                        onClick={() => handleDelete(req)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete requirement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
