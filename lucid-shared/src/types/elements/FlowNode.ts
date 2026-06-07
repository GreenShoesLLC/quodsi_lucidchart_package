import { PositionedSimulationObject } from './PositionedSimulationObject';

/**
 * Abstract base class for flow nodes in the simulation model.
 *
 * Flow nodes are the core building blocks of a simulation model:
 * - Generator: Creates entities and sends them into the flow
 * - Activity: Processes entities with optional resource requirements
 * - Connector: Routes entities between activities based on conditions
 *
 * All flow nodes share common properties:
 * - id: Unique identifier
 * - name: Human-readable name
 * - x, y: Position coordinates for visualization
 *
 * This class extends PositionedSimulationObject which provides the location
 * properties. It serves as a semantic grouping for flow-based components
 * that can be connected together to form a process flow.
 */
export abstract class FlowNode extends PositionedSimulationObject {
    // Inherits from PositionedSimulationObject:
    // - abstract id: string
    // - abstract name: string
    // - abstract type: SimulationObjectType
    // - x: number
    // - y: number
    // - setLocation(), getLocation(), hasLocation(), clone(), resetLocation(), toJSON()
}
