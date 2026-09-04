import React from "react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/lucid-shared";
import { useView } from "quodsi_studio/platforms/shared";

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
  // Complexity views (2026-09-04, Daniel's ruling): Resource is an
  // Intermediate concept (shape.type.resource), so a Basic viewer dropping a
  // block is offered Activity / Generator / None only -- the same gate the
  // drawio / Studio ShapeTypeSelector applies. The selected type is always
  // kept (disabled when the view hides it): filtering it out would make the
  // <select> fall to another value and one change event would reclassify
  // an existing Resource block.
  const { visible } = useView();
  const isOffered = (type: SimulationObjectType) =>
    type !== SimulationObjectType.Resource || visible.has("shape.type.resource");
  const validTypes = React.useMemo(() => {
    const base = !diagramElementType
      ? SIMULATION_TYPE_CONFIG
      : SIMULATION_TYPE_CONFIG.filter(({ type }) =>
          new Set<SimulationObjectType>(VALID_DIAGRAM_TYPE_MAPPINGS[diagramElementType]).has(type)
        );
    return base.filter(({ type }) => type === selectedType || isOffered(type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramElementType, selectedType, visible]);

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
        <option key={type} value={type} title={description} disabled={!isOffered(type)}>
          {displayName}
        </option>
      ))}
    </select>
  );
};
