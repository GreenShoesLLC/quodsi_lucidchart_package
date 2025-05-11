import React, { useState, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ModelElement } from "@quodsi/shared";

interface ModelTreeViewProps {
  element: ModelElement;
  modelStructure: { 
    elements: ModelElement[];
    hierarchy: Record<string, string[]>;
  };
  selectedId: string | null;
  onSelect: (id: string) => void;
  level?: number;
  expanded: Set<string>;
  onToggleExpand: (id: string, expanded: boolean) => void;
  onTreeStateUpdate?: (nodes: string[]) => void;
  onExpandPath?: (nodeId: string) => void;
}

interface ModelTreeNodeProps extends ModelTreeViewProps {
  isLastChild?: boolean;
}

const ModelTreeNode: React.FC<ModelTreeNodeProps> = ({
  element,
  modelStructure,
  selectedId,
  onSelect,
  level = 0,
  onToggleExpand,
  onTreeStateUpdate,
  onExpandPath,
  expanded,
  isLastChild = false,
}) => {
  const isNodeExpanded = expanded.has(element.id);
  console.log("[ModelTreeNode] Node state:", { 
    id: element.id, 
    isExpanded: isNodeExpanded,
    expandedSize: expanded.size,
    expandedNodes: Array.from(expanded)
  });

  const getChildElements = () => {
    // Get child IDs from the hierarchy
    const childIds = modelStructure.hierarchy[element.id] || [];
    
    if (!childIds.length) return [];

    if (element.id === "0_0") {
      // For root node, create category folders
      return childIds.map(id => {
        const lastPart = id.split('_').pop();
        const name = lastPart 
          ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1) 
          : 'Unknown';
          
        return {
          id,
          name,
          type: "Folder" as any,
          hasChildren: true,
          children: []
        };
      });
    }

    // For category folders and other nodes, return actual elements
    return childIds
      .map(id => modelStructure.elements.find(e => e.id === id))
      .filter((e): e is ModelElement => e !== undefined);
  };

  const childElements = getChildElements();
  const hasVisibleChildren = childElements.length > 0;

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      console.log("[ModelTreeNode] Expand clicked:", {
        id: element.id,
        currentExpanded: isNodeExpanded,
        willBe: !isNodeExpanded
      });
      onToggleExpand(element.id, !isNodeExpanded);
    },
    [element.id, isNodeExpanded, onToggleExpand]
  );

  return (
    <div className="select-none group">
      <div className="relative flex items-center">
        {level > 0 && (
          <>
            <div
              className="absolute border-l-2 border-gray-300"
              style={{
                left: `${(level - 1) * 20 + 9}px`,
                top: 0,
                bottom: isLastChild ? "50%" : "100%",
                width: "2px",
              }}
            />
            <div
              className="absolute border-t-2 border-gray-300"
              style={{
                left: `${(level - 1) * 20 + 9}px`,
                width: "12px",
                top: "50%",
              }}
            />
          </>
        )}

        <div
          className={`
            flex items-center py-1 px-2 text-sm rounded w-full relative
            ${
              selectedId === element.id
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-blue-50"
            }
            transition-colors duration-150 ease-in-out
          `}
          style={{ paddingLeft: `${level * 20}px` }}
          role="treeitem"
          aria-expanded={hasVisibleChildren ? isNodeExpanded : undefined}
          aria-selected={selectedId === element.id}
        >
          {hasVisibleChildren ? (
            <button
              onClick={handleExpandClick}
              className="p-0.5 hover:bg-blue-200 rounded-sm mr-1"
              aria-label={isNodeExpanded ? "Collapse" : "Expand"}
            >
              {isNodeExpanded ? (
                <ChevronDown size={14} className="flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="flex-shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <button
            onClick={() => {
              onSelect(element.id);
              if (onExpandPath) {
                onExpandPath(element.id);
              }
            }}
            className="flex-grow text-left px-1 py-0.5 rounded hover:bg-blue-100/50"
          >
            <span className="truncate">{element.name}</span>
          </button>
        </div>
      </div>

      {isNodeExpanded && hasVisibleChildren && (
        <div role="group" className="transition-all duration-200">
          {childElements.map((child, index) => (
            <ModelTreeNode
              key={child.id}
              element={child}
              modelStructure={modelStructure}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
              onToggleExpand={onToggleExpand}
              onTreeStateUpdate={onTreeStateUpdate}
              onExpandPath={onExpandPath}
              expanded={expanded}
              isLastChild={index === childElements.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ModelTreeView: React.FC<ModelTreeViewProps> = ({
  element,
  modelStructure,
  selectedId,
  onSelect,
  level = 0,
  expanded,
  onToggleExpand,
  onTreeStateUpdate,
  onExpandPath,
}) => {
  console.log("[ModelTreeView] Rendering tree:", {
    rootId: element.id,
    expandedNodes: Array.from(expanded)
  });

  return (
    <div role="tree" className="w-full">
      <ModelTreeNode
        element={element}
        modelStructure={modelStructure}
        selectedId={selectedId}
        onSelect={onSelect}
        level={level}
        onToggleExpand={onToggleExpand}
        onTreeStateUpdate={onTreeStateUpdate}
        onExpandPath={onExpandPath}
        expanded={expanded}
      />
    </div>
  );
};