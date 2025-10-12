import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Check } from 'lucide-react';
import { ResourceRequirement } from '@quodsi/shared';
import { TeamStructure, generatePreview } from '../../utils/resourceRequirementConverter';

interface ResourceRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (requirement: { name: string; structure: TeamStructure }) => void;
  editingRequirement?: { name: string; structure: TeamStructure } | null;
  availableResources: Array<{ id: string; name: string }>;
}

// Template definitions
const createTemplates = (resources: Array<{ id: string; name: string }>): Array<{ name: string; description: string; structure: TeamStructure }> => {
  if (resources.length === 0) return [];
  
  const templates: Array<{ name: string; description: string; structure: TeamStructure }> = [
    {
      name: 'Single Resource Type',
      description: 'Need a specific quantity of one resource',
      structure: {
        mode: 'ALL',
        teams: [{
          mode: 'ALL',
          requests: [{ resourceId: resources[0].id, quantity: 1 }]
        }]
      }
    }
  ];
  
  if (resources.length >= 2) {
    templates.push({
      name: 'Flexible Options',
      description: 'Any one of several resource options',
      structure: {
        mode: 'ANY',
        teams: [
          { mode: 'ALL', requests: [{ resourceId: resources[0].id, quantity: 1 }] },
          { mode: 'ALL', requests: [{ resourceId: resources[1].id, quantity: 2 }] }
        ]
      }
    });
  }
  
  if (resources.length >= 3) {
    templates.push({
      name: 'Mixed Team Options',
      description: `(1 ${resources[0].name} + 1 ${resources[2].name}) OR (2 ${resources[1].name} + 1 ${resources[2].name})`,
      structure: {
        mode: 'ANY',
        teams: [
          {
            mode: 'ALL',
            requests: [
              { resourceId: resources[0].id, quantity: 1 },
              { resourceId: resources[2].id, quantity: 1 }
            ]
          },
          {
            mode: 'ALL',
            requests: [
              { resourceId: resources[1].id, quantity: 2 },
              { resourceId: resources[2].id, quantity: 1 }
            ]
          }
        ]
      }
    });
    
    templates.push({
      name: 'Advanced: Mixed Modes',
      description: `(${resources[0].name} OR ${resources[1].name}) AND ${resources[2].name}`,
      structure: {
        mode: 'ALL',
        teams: [
          {
            mode: 'ANY',
            requests: [
              { resourceId: resources[0].id, quantity: 1 },
              { resourceId: resources[1].id, quantity: 2 }
            ]
          },
          {
            mode: 'ALL',
            requests: [{ resourceId: resources[2].id, quantity: 1 }]
          }
        ]
      }
    });
  }
  
  return templates;
};

export const ResourceRequirementModal: React.FC<ResourceRequirementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRequirement,
  availableResources
}) => {
  const [name, setName] = useState('');
  const [requirement, setRequirement] = useState<TeamStructure>({
    mode: 'ANY',
    teams: []
  });
  const [activeTab, setActiveTab] = useState<'templates' | 'build'>('build');

  // Initialize state when modal opens or editing requirement changes
  useEffect(() => {
    if (isOpen) {
      if (editingRequirement) {
        setName(editingRequirement.name);
        setRequirement(editingRequirement.structure);
        setActiveTab('build');
      } else {
        setName('');
        setRequirement({ mode: 'ANY', teams: [] });
        setActiveTab('templates');
      }
    }
  }, [isOpen, editingRequirement]);

  // Debug logging to verify availableResources
  useEffect(() => {
    if (isOpen) {
      console.log('[ResourceRequirementModal] Modal opened with:', {
        isOpen,
        availableResourcesCount: availableResources.length,
        availableResources: availableResources,
        editingRequirement: editingRequirement ? editingRequirement.name : 'none',
        templatesCount: createTemplates(availableResources).length
      });
    }
  }, [isOpen, availableResources, editingRequirement]);

  if (!isOpen) return null;

  const templates = createTemplates(availableResources);

  const loadTemplate = (template: { name: string; description: string; structure: TeamStructure }) => {
    setRequirement(template.structure);
    if (!name) {
      setName(template.name);
    }
    setActiveTab('build');
  };

  const addTeam = () => {
    const usedInTeams = requirement.teams.flatMap(t => t.requests.map(r => r.resourceId));
    const availableResource = availableResources.find(r => !usedInTeams.includes(r.id)) || availableResources[0];
    
    setRequirement({
      ...requirement,
      teams: [...requirement.teams, {
        mode: 'ALL',
        requests: [{ resourceId: availableResource.id, quantity: 1 }]
      }]
    });
  };

  const removeTeam = (teamIdx: number) => {
    setRequirement({
      ...requirement,
      teams: requirement.teams.filter((_, i) => i !== teamIdx)
    });
  };

  const updateTeamMode = (teamIdx: number, mode: 'ALL' | 'ANY') => {
    const updatedTeams = [...requirement.teams];
    updatedTeams[teamIdx] = { ...updatedTeams[teamIdx], mode };
    setRequirement({ ...requirement, teams: updatedTeams });
  };

  const addResourceToTeam = (teamIdx: number) => {
    const currentTeam = requirement.teams[teamIdx];
    const usedResourceIds = new Set(currentTeam.requests.map(r => r.resourceId));
    const availableResource = availableResources.find(r => !usedResourceIds.has(r.id));
    
    if (!availableResource) {
      alert('All available resources are already in this team');
      return;
    }

    const updatedTeams = [...requirement.teams];
    updatedTeams[teamIdx] = {
      ...updatedTeams[teamIdx],
      requests: [...updatedTeams[teamIdx].requests, { resourceId: availableResource.id, quantity: 1 }]
    };
    setRequirement({ ...requirement, teams: updatedTeams });
  };

  const removeResourceFromTeam = (teamIdx: number, reqIdx: number) => {
    const updatedTeams = [...requirement.teams];
    updatedTeams[teamIdx] = {
      ...updatedTeams[teamIdx],
      requests: updatedTeams[teamIdx].requests.filter((_, i) => i !== reqIdx)
    };
    
    if (updatedTeams[teamIdx].requests.length === 0) {
      updatedTeams.splice(teamIdx, 1);
    }
    
    setRequirement({ ...requirement, teams: updatedTeams });
  };

  const updateTeamResource = (teamIdx: number, reqIdx: number, field: 'resourceId' | 'quantity', value: string | number) => {
    if (field === 'resourceId') {
      const currentTeam = requirement.teams[teamIdx];
      const isDuplicate = currentTeam.requests.some((req, idx) => 
        idx !== reqIdx && req.resourceId === value
      );
      
      if (isDuplicate) {
        alert('This resource is already in this team. Each resource can only appear once per team.');
        return;
      }
    }

    const updatedTeams = [...requirement.teams];
    updatedTeams[teamIdx].requests[reqIdx] = {
      ...updatedTeams[teamIdx].requests[reqIdx],
      [field]: value
    };
    setRequirement({ ...requirement, teams: updatedTeams });
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name for this requirement');
      return;
    }
    if (requirement.teams.length === 0) {
      alert('Please add at least one team option. You can select a template or click "Add New Team".');
      return;
    }
    
    onSave({ name, structure: requirement });
  };

  const getResourceName = (id: string): string => {
    return availableResources.find(r => r.id === id)?.name || 'Unknown';
  };

  const previewText = generatePreview(requirement, getResourceName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50 flex-shrink-0">
          <h2 className="font-semibold text-base">
            {editingRequirement ? 'Edit' : 'Create'} Resource Requirement
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('build')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium ${
              activeTab === 'build'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Build Custom
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: 0 }}>
          {/* Name Input */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Requirement Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Development Team"
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-600 mb-2">Choose a template to get started:</p>
              {templates.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">
                  No resources available to create templates
                </p>
              ) : (
                templates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadTemplate(template)}
                    className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition"
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{template.description}</div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Build Tab */}
          {activeTab === 'build' && (
            <div>
              {/* Mode Selector */}
              <div className="mb-3 p-2 bg-gray-50 rounded border">
                <label className="block text-sm font-medium mb-1.5">Op Step needs:</label>
                <select
                  value={requirement.mode}
                  onChange={(e) => setRequirement({ ...requirement, mode: e.target.value as 'ALL' | 'ANY' })}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-white"
                >
                  <option value="ALL">ALL of the following teams</option>
                  <option value="ANY">ANY ONE of the following teams</option>
                </select>
              </div>

              {/* Teams */}
              <div className="space-y-2">
                <div className="text-sm font-medium mb-1.5 flex items-center justify-between">
                  <span>Team Options:</span>
                  {requirement.teams.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {requirement.mode === 'ANY' ? 'Pick one team' : 'Need all teams'}
                    </span>
                  )}
                </div>

                {requirement.teams.map((team, teamIdx) => (
                  <div key={teamIdx} className="p-2 bg-purple-50 rounded border-2 border-purple-300">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-purple-900">
                        {requirement.mode === 'ANY' ? `Option ${teamIdx + 1}` : `Team ${teamIdx + 1}`}
                      </span>
                      <button
                        onClick={() => removeTeam(teamIdx)}
                        className="p-0.5 text-red-600 hover:bg-red-100 rounded"
                        title="Remove this team"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Team Mode Selector - only show if team has multiple resources */}
                    {team.requests.length > 1 && (
                      <div className="mb-1.5">
                        <select
                          value={team.mode}
                          onChange={(e) => updateTeamMode(teamIdx, e.target.value as 'ALL' | 'ANY')}
                          className="w-full px-2 py-1 text-xs border rounded bg-white font-medium"
                        >
                          <option value="ALL">Need ALL of these resources</option>
                          <option value="ANY">Need ANY ONE of these resources</option>
                        </select>
                      </div>
                    )}

                    {/* Resources in Team */}
                    <div className="space-y-1.5 mb-1.5">
                      {team.requests.map((req, reqIdx) => (
                        <div key={reqIdx} className="flex gap-1.5 items-center bg-white p-1.5 rounded border border-purple-200">
                          <input
                            type="number"
                            value={req.quantity}
                            onChange={(e) => updateTeamResource(teamIdx, reqIdx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-12 px-1.5 py-1 text-xs border rounded"
                            min="1"
                          />
                          <select
                            value={req.resourceId}
                            onChange={(e) => updateTeamResource(teamIdx, reqIdx, 'resourceId', e.target.value)}
                            className="flex-1 px-1.5 py-1 text-xs border rounded"
                          >
                            {availableResources.map(r => {
                              const isUsed = team.requests.some((request, idx) =>
                                idx !== reqIdx && request.resourceId === r.id
                              );
                              return (
                                <option key={r.id} value={r.id} disabled={isUsed}>
                                  {r.name} {isUsed ? '(in team)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          {team.requests.length > 1 && (
                            <button
                              onClick={() => removeResourceFromTeam(teamIdx, reqIdx)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Remove from team"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Resource to Team */}
                    <button
                      onClick={() => addResourceToTeam(teamIdx)}
                      className="w-full py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded border border-purple-300 flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Add Resource to Team
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Team */}
              {availableResources.length > 0 && (
                <button
                  onClick={addTeam}
                  className="w-full mt-2 py-1.5 text-sm bg-purple-200 hover:bg-purple-300 rounded border-2 border-purple-400 flex items-center justify-center gap-1 font-medium"
                >
                  <Plus size={14} /> Add New Team
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end gap-1.5 mb-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <Check size={14} />
              {editingRequirement ? 'Update' : 'Create'}
            </button>
          </div>

          {/* Preview */}
          <div className="p-1.5 bg-gray-100 rounded border text-xs">
            <div className="font-medium mb-0.5">Preview:</div>
            <div className="text-gray-700 text-xs">{previewText}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
