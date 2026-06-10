import React, { useState } from "react";
import { Plus, Info, Pencil, Trash2, Lock } from "lucide-react";
import { ModelDefaults } from "@quodsi/lucid-shared";

/**
 * Minimal entity row shape edited by this tab. Entities are stored as a
 * page-level list (q_entities), mirroring States / Resource Requirements.
 * Geometry (x/y) is meaningless for list-based entities and is not edited here.
 */
export interface EntityRow {
  id: string;
  name: string;
  description?: string;
}

interface Props {
  entities: EntityRow[];
  onEntitiesChange: (entities: EntityRow[]) => void;
}

const isDefaultEntity = (id: string): boolean =>
  id === ModelDefaults.DEFAULT_ENTITY_ID;

/**
 * EntitiesEditor - Model Editor tab for defining entity types.
 *
 * An entity is a type definition (e.g. "Customer", "Part") referenced by
 * Generators and Activities. The default entity is required and cannot be
 * deleted: every new Generator defaults its entityId to it, and the model must
 * always have at least one entity.
 */
const EntitiesEditor: React.FC<Props> = ({ entities, onEntitiesChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | undefined>(undefined);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const beginAdd = () => {
    setEditingId(undefined);
    setDraftName("");
    setDraftDescription("");
    setIsAdding(true);
  };

  const beginEdit = (entity: EntityRow) => {
    setIsAdding(false);
    setEditingId(entity.id);
    setDraftName(entity.name);
    setDraftDescription(entity.description ?? "");
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(undefined);
    setDraftName("");
    setDraftDescription("");
  };

  const saveForm = () => {
    const name = draftName.trim();
    if (!name) return;

    if (isAdding) {
      const newEntity: EntityRow = {
        id: crypto.randomUUID(),
        name,
        description: draftDescription.trim() || undefined,
      };
      onEntitiesChange([...entities, newEntity]);
    } else if (editingId) {
      onEntitiesChange(
        entities.map((e) =>
          e.id === editingId
            ? { ...e, name, description: draftDescription.trim() || undefined }
            : e
        )
      );
    }
    cancelForm();
  };

  const confirmDelete = () => {
    if (deletingId && !isDefaultEntity(deletingId)) {
      onEntitiesChange(entities.filter((e) => e.id !== deletingId));
    }
    setDeletingId(undefined);
  };

  const deletingEntity = entities.find((e) => e.id === deletingId);
  const isFormOpen = isAdding || editingId !== undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add Button */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-medium text-gray-700">Entities</span>
          <span title="Entities are the items that flow through your simulation (e.g. customers, parts, orders). Generators create entities of a given type. The default entity is always available.">
            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            {entities.length === 0
              ? "No entities defined"
              : `${entities.length} entit${entities.length === 1 ? "y" : "ies"}`}
          </p>
          <button
            type="button"
            onClick={beginAdd}
            disabled={isFormOpen}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entity
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {isFormOpen && (
        <div className="mx-3 mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-xs font-medium text-blue-900 mb-2">
            {isAdding ? "Add Entity" : "Edit Entity"}
          </div>
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              autoFocus
              className="w-full px-2 py-1 text-xs border rounded"
              value={draftName}
              placeholder="Entity name"
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveForm();
                if (e.key === "Escape") cancelForm();
              }}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              className="w-full px-2 py-1 text-xs border rounded"
              value={draftDescription}
              placeholder="Optional description"
              onChange={(e) => setDraftDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveForm();
                if (e.key === "Escape") cancelForm();
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveForm}
              disabled={!draftName.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isAdding ? "Add" : "Save"}
            </button>
            <button
              onClick={cancelForm}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingEntity && (
        <div className="mx-3 mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-xs font-medium text-red-900 mb-2">
            Delete Entity: "{deletingEntity.name}"?
          </div>
          <div className="text-xs text-red-700 mb-3">
            ⚠️ Any references to this entity in Generators, Activities, and Create
            actions will be cleared. This action cannot be undone.
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Entity
            </button>
            <button
              onClick={() => setDeletingId(undefined)}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entities List */}
      <div className="flex-1 overflow-y-auto p-3">
        {entities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500 mb-2">No entities defined yet</p>
            <p className="text-xs text-gray-400">
              Click "Add Entity" to create your first entity type
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entities.map((entity) => {
              const locked = isDefaultEntity(entity.id);
              return (
                <div
                  key={entity.id}
                  className="flex items-start justify-between p-2 bg-white border rounded"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-gray-800 truncate">
                        {entity.name}
                      </span>
                      {locked && (
                        <span title="The default entity is required and can't be deleted.">
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                      )}
                    </div>
                    {entity.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {entity.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(entity)}
                      title="Edit entity"
                      className="p-1 text-gray-500 hover:text-blue-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => setDeletingId(entity.id)}
                        title="Delete entity"
                        className="p-1 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntitiesEditor;
