import { SimulationElement } from './SimulationElement';
import { Model } from './elements/model';
import { Activity } from './elements/activity';
import { Connector } from './elements/connector';
import { Resource } from './elements/resource';
import { Generator } from './elements/generator';
import { Entity } from './elements/entity';
import { SimulationObjectType } from './elements/enums/simulationObjectType';
import { ConnectType } from './elements/enums/connectType';
import { Duration } from './elements/duration';
import { SimulationElementWrapper } from './SimulationElementWrapper';

export const SimulationElementFactory = {
    createElement(metadata: { type: SimulationObjectType }, data: any): SimulationElement {
        switch (metadata.type) {
            case SimulationObjectType.Model:
                return new SimulationElementWrapper(this.createModel(data));

            case SimulationObjectType.Activity:
                return new SimulationElementWrapper(this.createActivity(data));

            case SimulationObjectType.Connector:
                return new SimulationElementWrapper(this.createConnector(data));

            case SimulationObjectType.Resource:
                return new SimulationElementWrapper(this.createResource(data));

            case SimulationObjectType.Generator:
                return new SimulationElementWrapper(this.createGenerator(data));

            case SimulationObjectType.Entity:
                return new SimulationElementWrapper(this.createEntity(data));

            default:
                throw new Error(`Unknown element type: ${metadata.type}`);
        }
    },

    createModel(data: any): Model {
        return new Model(
            data.id,  // Use provided ID instead of generating new one
            data.name || 'New Model',
            data.reps || 1,
            data.forecastDays || 30,
            data.seed,
            data.oneClockUnit,
            data.simulationTimeType,
            data.warmupClockPeriod,
            data.warmupClockPeriodUnit,
            data.runClockPeriod,
            data.runClockPeriodUnit,
            data.warmupDateTime ? new Date(data.warmupDateTime) : null,
            data.startDateTime ? new Date(data.startDateTime) : null,
            data.finishDateTime ? new Date(data.finishDateTime) : null
        );
    },

    createActivity(data: any): Activity {
        return new Activity(
            data.id,  // Use provided ID instead of generating new one
            data.name || 'New Activity',
            data.capacity || 1,
            data.inputBufferCapacity ?? Infinity,
            data.outputBufferCapacity ?? Infinity,
            data.operationSteps || []
        );
    },

    createConnector(data: any): Connector {
        return new Connector(
            data.id,  // Use provided ID instead of generating new one
            data.name || 'New Connector',
            data.probability || 1.0,
            data.connectType || ConnectType.Probability,
            data.operationSteps || []
        );
    },

    createResource(data: any): Resource {
        return new Resource(
            data.id,  // Use provided ID instead of generating new one
            data.name || 'New Resource',
            data.capacity || 1
        );
    },

    createGenerator(data: any): Generator {
        return new Generator(
            data.id,  // Use provided ID instead of generating new one
            data.name || 'New Generator',
            data.activityKeyId || '',
            data.entityType || 'All',
            data.periodicOccurrences ?? Infinity,
            data.periodIntervalDuration || new Duration(),
            data.entitiesPerCreation || 1,
            data.periodicStartDuration || new Duration(),
            data.maxEntities ?? Infinity
        );
    },

    createEntity(data: any): Entity {
        return new Entity(
            data.id,  // Use provided ID instead of generating new one
            data.name || 'New Entity'
        );
    }
} as const;