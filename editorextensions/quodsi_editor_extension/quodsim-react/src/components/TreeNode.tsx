import { SimulationObjectType } from "@quodsi/shared";
import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TreeNodeProps {
  node: {
    id: string;
    name: string;
    type: SimulationObjectType;
    hasChildren: boolean;
    children?: TreeNodeProps["node"][];
  };
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeColor = (type: SimulationObjectType): string => {
    const colors: Record<SimulationObjectType, string> = {
      [SimulationObjectType.Activity]: "bg-blue-100 text-blue-800",
      [SimulationObjectType.Connector]: "bg-green-100 text-green-800",
      [SimulationObjectType.Resource]: "bg-purple-100 text-purple-800",
      [SimulationObjectType.ResourceRequirement]: "bg-purple-100 text-purple-800",
      [SimulationObjectType.Generator]: "bg-yellow-100 text-yellow-800",
      [SimulationObjectType.Entity]: "bg-red-100 text-red-800",
      [SimulationObjectType.Model]: "bg-gray-100 text-gray-800",
      [SimulationObjectType.Scenario]: "bg-gray-100 text-gray-800",
      [SimulationObjectType.Experiment]: "bg-gray-100 text-gray-800",
      [SimulationObjectType.None]: "bg-gray-100 text-gray-800",
    };
    return colors[type];
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 p-2 mx-1 my-0.5 rounded-md
          hover:bg-gray-50 cursor-pointer transition-colors
          border border-transparent hover:border-gray-200
        `}
        style={{ marginLeft: `${level * 16}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transform transition-transform duration-200
          ${isExpanded ? "rotate-90" : ""}`}
        />
        <div
          className={`px-2 py-0.5 rounded-md text-sm ${getTypeColor(
            node.type
          )}`}
        >
          {node.name}
        </div>
      </div>
      {isExpanded &&
        node.children?.map((child) => (
          <TreeNode key={child.id} node={child} level={level + 1} />
        ))}
    </div>
  );
};

export default TreeNode;