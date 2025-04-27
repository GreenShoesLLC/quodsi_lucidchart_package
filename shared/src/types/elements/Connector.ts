import { SimulationObjectType } from "./SimulationObjectType";
import { ConnectType } from "./ConnectType";
import { OperationStep } from "./OperationStep";
import { PositionedSimulationObject } from "./PositionedSimulationObject";

export class Connector extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Connector;

    // Add source and target location properties
    sourceX: number = 0;
    sourceY: number = 0;
    targetX: number = 0;
    targetY: number = 0;

    static createDefault(
        id: string, 
        sourceX: number = 0, 
        sourceY: number = 0,
        targetX: number = 0, 
        targetY: number = 0
    ): Connector {
        const connector = new Connector(
            id,
            'New Connector',
            '', // sourceId
            '', // targetId
            1.0, // probability
            ConnectType.Probability, // connectType
            [] // operationSteps
        );

        // Set source and target coordinates
        connector.sourceX = sourceX;
        connector.sourceY = sourceY;
        connector.targetX = targetX;
        connector.targetY = targetY;

        // Set midpoint as default location
        connector.setLocation(
            (sourceX + targetX) / 2, 
            (sourceY + targetY) / 2
        );

        return connector;
    }

    constructor(
        public id: string,
        public name: string,
        public sourceId: string,
        public targetId: string,
        public probability: number = 1.0,
        public connectType: ConnectType = ConnectType.Probability,
        public operationSteps: OperationStep[] = [],
        sourceX: number = 0,
        sourceY: number = 0,
        targetX: number = 0,
        targetY: number = 0,
        x: number = 0,
        y: number = 0
    ) { 
        super();
        
        // Set source and target coordinates
        this.sourceX = sourceX;
        this.sourceY = sourceY;
        this.targetX = targetX;
        this.targetY = targetY;

        // Set location to midpoint by default
        this.setLocation(
            x || (sourceX + targetX) / 2, 
            y || (sourceY + targetY) / 2
        );
    }

    /**
     * Update source location
     */
    setSourceLocation(x: number, y: number): void {
        this.sourceX = x;
        this.sourceY = y;
        
        // Recalculate midpoint
        this.setLocation(
            (this.sourceX + this.targetX) / 2, 
            (this.sourceY + this.targetY) / 2
        );
    }

    /**
     * Update target location
     */
    setTargetLocation(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;
        
        // Recalculate midpoint
        this.setLocation(
            (this.sourceX + this.targetX) / 2, 
            (this.sourceY + this.targetY) / 2
        );
    }
}