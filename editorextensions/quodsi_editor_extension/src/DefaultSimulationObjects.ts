import { SimulationObjectType } from "./models/enums/simulationObjectType";
import { Model } from "./models/model";
import { Activity } from "./models/activity";
import { Connector } from "./models/connector";
import { Entity } from "./models/entity";
import { Resource } from "./models/resource";
import { Scenario } from "./models/scenario"; // Assuming you have this model
import { Experiment } from "./models/experiment"; // Assuming you have this model
import { Generator } from "./models/generator"; // Assuming you have this model
import { LucidChartUtils } from "./lucidChartUtils";
import { PeriodUnit } from "./models/enums/PeriodUnit";
import { SimulationTimeType } from "./models/enums/simulation_time_type";
import { ConnectType } from "./models/enums/connectType";
import { Duration } from "./models/duration";


export class DefaultSimulationObjects {
    static initialModel(): Model {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Model1",
            type: SimulationObjectType.Model,
            reps: 0,
            forecastDays: 0,
            seed: 12345,
            oneClockUnit: PeriodUnit.MINUTES,
            simulationTimeType: SimulationTimeType.Clock,
            warmupClockPeriod: 0.0,
            warmupClockPeriodUnit: PeriodUnit.HOURS,
            runClockPeriod: 24.0,
            runClockPeriodUnit: PeriodUnit.HOURS,
            warmupDateTime: null,
            startDateTime: null,
            finishDateTime: null
        };
    }

    static initialActivity(): Activity {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Activity1",
            type: SimulationObjectType.Activity,
            capacity: 1,
            inputBufferCapacity: 999,
            outputBufferCapacity: 999,
            operationSteps: []
        };
    }

    static initialConnector(): Connector {
        return {
            id: LucidChartUtils.generateSimpleUUID(),
            name: "Connector1",
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
