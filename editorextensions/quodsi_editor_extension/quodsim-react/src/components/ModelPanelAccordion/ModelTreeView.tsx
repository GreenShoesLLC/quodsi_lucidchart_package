import React, { useState, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ModelElement } from "@quodsi/shared";

interface ModelTreeViewProps {
  element: ModelElement;
  modelStructure: { elements: ModelElement[] };
  selectedId: string | null;
  onSelect: (id: string) => void;
  level?: number;
  expanded?: Set<string>;
  onToggleExpand?: (id: string) => void;
}

interface ModelTreeNodeProps extends ModelTreeViewProps {
  isExpanded: boolean;
  isLastChild?: boolean;
}

const ModelTreeNode: React.FC<ModelTreeNodeProps> = ({
  element,
  modelStructure,
  selectedId,
  onSelect,
  level = 0,
  isExpanded,
  onToggleExpand,
  expanded,
  isLastChild = false,
}) => {
  const childElements =
    element.id === "0_0"
      ? modelStructure.elements.filter((e) => e.id.match(/^0_0_[a-z]+$/))
      : element.id.endsWith("_activities")
      ? modelStructure.elements.filter(
          (e) => e.type === "Activity" && !e.id.includes("_")
        )
      : element.id.endsWith("_connectors")
      ? modelStructure.elements.filter(
          (e) => e.type === "Connector" && !e.id.includes("_")
        )
      : element.id.endsWith("_resources")
      ? modelStructure.elements.filter(
          (e) => e.type === "Resource" && !e.id.includes("_")
        )
      : element.id.endsWith("_generators")
      ? modelStructure.elements.filter(
          (e) => e.type === "Generator" && !e.id.includes("_")
        )
      : element.id.endsWith("_entities")
      ? modelStructure.elements.filter(
          (e) => e.type === "Entity" && !e.id.includes("_")
        )
      : modelStructure.elements.filter((e) =>
          e.id.startsWith(`${element.id}_`)
        );

  const hasVisibleChildren = childElements.length > 0;

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand?.(element.id);
    },
    [element.id, onToggleExpand]
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
          aria-expanded={hasVisibleChildren ? isExpanded : undefined}
          aria-selected={selectedId === element.id}
        >
          {hasVisibleChildren ? (
            <button
              onClick={handleExpandClick}
              className="p-0.5 hover:bg-blue-200 rounded-sm mr-1"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="flex-shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <button
            onClick={() => onSelect(element.id)}
            className="flex-grow text-left px-1 py-0.5 rounded hover:bg-blue-100/50"
          >
            <span className="truncate">{element.name}</span>
          </button>
        </div>
      </div>

      {isExpanded && hasVisibleChildren && (
        <div role="group" className="transition-all duration-200">
          {childElements.map((child, index) => (
            <ModelTreeNode
              key={child.id}
              element={child}
              modelStructure={modelStructure}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
              isExpanded={expanded?.has(child.id) ?? false}
              onToggleExpand={onToggleExpand}
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
  expanded: externalExpanded,
  onToggleExpand: externalOnToggleExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    new Set()
  );

  const expanded = externalExpanded ?? internalExpanded;
  const onToggleExpand = useCallback(
    (id: string) => {
      if (externalOnToggleExpand) {
        externalOnToggleExpand(id);
      } else {
        setInternalExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      }
    },
    [externalOnToggleExpand]
  );

  return (
    <div role="tree" className="w-full">
      <ModelTreeNode
        element={element}
        modelStructure={modelStructure}
        selectedId={selectedId}
        onSelect={onSelect}
        level={level}
        isExpanded={expanded.has(element.id)}
        onToggleExpand={onToggleExpand}
        expanded={expanded}
      />
    </div>
  );
};
