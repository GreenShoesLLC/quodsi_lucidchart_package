import React from "react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/lucid-shared";

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
    <select
      value={selectedType}
      onChange={(e) =>
        onTypeChange(e.target.value as SimulationObjectType, elementId)
      }
      disabled={disabled}
      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
    >
      {validTypes.map(({ type, displayName, description }) => (
        <option key={type} value={type} title={description}>
          {displayName}
        </option>
      ))}
    </select>
  );
};
