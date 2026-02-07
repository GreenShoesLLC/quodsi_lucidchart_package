import { SimulationObjectType } from "./SimulationObjectType";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
import { ResourceFinancialProperties } from "./FinancialProperties";

export class Resource extends PositionedSimulationObject {
    type: SimulationObjectType = SimulationObjectType.Resource;

    /**
     * Financial properties for Phase 1 costing
     */
    financialProperties?: ResourceFinancialProperties;

    static createDefault(
        id: string, 
        x: number = 0, 
        y: number = 0
    ): Resource {
        const resource = new Resource(
            id,
            'New Resource',
            1, // capacity
            x,
            y
        );

        return resource;
    }

    description: string = '';

    constructor(
        public id: string,
        public name: string,
        public capacity: number = 1,
        x: number = 0,
        y: number = 0
    ) {
        super();
        // Set location using inherited method
        this.setLocation(x, y);
    }
}