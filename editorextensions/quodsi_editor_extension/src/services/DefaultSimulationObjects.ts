import { SimulationObjectType } from "../shared/types/elements/SimulationObjectType";
import { Model } from "../shared/types/elements/Model";
import { Activity } from "../shared/types/elements/Activity";
import { Connector } from "../shared/types/elements/Connector";
import { Entity } from "../shared/types/elements/Entity";
import { Resource } from "../shared/types/elements/Resource";
import { Scenario } from "../shared/types/elements/Scenario"; // Assuming you have this model
import { Experiment } from "../shared/types/elements/Experiment"; // Assuming you have this model
import { Generator } from "../shared/types/elements/Generator"; // Assuming you have this model
import { LucidChartUtils } from "../utilis/lucidChartUtils";
import { ConnectType } from "../shared/types/elements/ConnectType";
import { Duration } from "../shared/types/elements/Duration";


export class DefaultSimulationObjects {
    static initialActivity(): Activity {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Activity1",
            type: SimulationObjectType.Activity,
            capacity: 1,
            inputBufferCapacity: 999,
            outputBufferCapacity: 999,
            operationSteps: [],
            connectors: []
        };
    }

    static initialConnector(): Connector {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Connector1",
            sourceId: "",
            targetId: "",
            type: SimulationObjectType.Connector,
            connectType: ConnectType.Probability,
            probability: 1.0,
            operationSteps: []
        };
    }

    static initialEntity(): Entity {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Entity1",
            type: SimulationObjectType.Entity
        };
    }

    static initialResource(): Resource {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Resource1",
            type: SimulationObjectType.Resource,
            capacity: 1
        };
    }

    static initialScenario(): Scenario {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Scenario1",
            type: SimulationObjectType.Scenario,
            reps: 1, // Default value for reps
            forecastDays: 30, // Default value for forecastDays
            runState: "not run", // Use an allowed value for runState
            // Add any other scenario-specific default values here
        };
    }



    static initialExperiment(): Experiment {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Experiment1",
            type: SimulationObjectType.Experiment,
            scenarios: [], // Correct default value for scenarios
            // Add any other experiment-specific default values here
        };
    }

    static initialGenerator(): Generator {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Generator1",
            type: SimulationObjectType.Generator,
            maxEntities: Infinity,
            entitiesPerCreation: 1,
            periodicOccurrences: Infinity,
            entityType: "All",
            periodicStartDuration: new Duration(),
            periodIntervalDuration: new Duration(),
            activityKeyId: "Start"
            // Add any generator-specific default values here
        };
    }
}
