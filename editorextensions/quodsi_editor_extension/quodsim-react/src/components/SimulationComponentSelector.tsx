import React from "react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/shared";

import { Settings } from "lucide-react";

interface SimulationTypeInfo {
  type: SimulationObjectType;
  displayName: string;
  description: string;
}

const SIMULATION_TYPE_CONFIG: SimulationTypeInfo[] = [
  {
    type: SimulationObjectType.Activity,
    displayName: "Activity",
    description: "Represents a process or action",
  },
  {
    type: SimulationObjectType.Entity,
    displayName: "Entity",
    description: "Represents objects flowing through the system",
  },
  {
    type: SimulationObjectType.Generator,
    displayName: "Generator",
    description: "Creates entities in the simulation",
  },
  {
    type: SimulationObjectType.Resource,
    displayName: "Resource",
    description: "Represents available capacity",
  },
  {
    type: SimulationObjectType.Connector,
    displayName: "Connector",
    description: "Connects components in the simulation",
  },
  {
    type: SimulationObjectType.None,
    displayName: "None",
    description: "Not a Simulation Object",
  },
];

const VALID_DIAGRAM_TYPE_MAPPINGS: Record<
  DiagramElementType,
  SimulationObjectType[]
> = {
  [DiagramElementType.LINE]: [
    SimulationObjectType.None, SimulationObjectType.Connector,
  ],
  [DiagramElementType.BLOCK]: [
    SimulationObjectType.None,
    SimulationObjectType.Activity,
    SimulationObjectType.Entity,
    SimulationObjectType.Generator,
    SimulationObjectType.Resource,
  ],
};
interface SimulationComponentSelectorProps {
  selectedType: SimulationObjectType;
  elementId: string;
  diagramElementType?: DiagramElementType;
  onTypeChange: (type: SimulationObjectType, elementId: string) => void;
  disabled?: boolean;
}

export const SimulationComponentSelector: React.FC<
  SimulationComponentSelectorProps
> = ({
  selectedType,
  elementId,
  diagramElementType,
  onTypeChange,
  disabled = false,
}) => {
  const validTypes = React.useMemo(() => {
    if (!diagramElementType) return SIMULATION_TYPE_CONFIG;

    // Create a Set from the valid types for this diagram element type
    const validTypeSet = new Set<SimulationObjectType>(
      VALID_DIAGRAM_TYPE_MAPPINGS[diagramElementType]
    );

    return SIMULATION_TYPE_CONFIG.filter(({ type }) => validTypeSet.has(type));
  }, [diagramElementType]);

  return (
    <div className="space-y-2 p-2">
      {/* <div className="flex items-center gap-1 mb-1">
        <Settings className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-medium text-gray-700">
          Component Type
        </span>
      </div> */}
      <select
        value={selectedType}
        onChange={(e) =>
          onTypeChange(e.target.value as SimulationObjectType, elementId)
        }
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border rounded"
      >
        {validTypes.map(({ type, displayName, description }) => (
          <option key={type} value={type} title={description}>
            {displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
