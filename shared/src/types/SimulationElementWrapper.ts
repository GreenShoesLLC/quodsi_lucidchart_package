import { SimulationElement } from './SimulationElement';
import { Model } from './elements/Model';
import { Activity } from './elements/Activity';
import { Connector } from './elements/Connector';
import { Resource } from './elements/Resource';
import { Generator } from './elements/Generator';
import { Entity } from './elements/Entity';
import { SimulationObjectType } from './elements/SimulationObjectType';
import { ValidationMessage, ValidationResult } from './validation/ValidationTypes';


type BaseElement = Model | Activity | Connector | Resource | Generator | Entity;

export class SimulationElementWrapper implements SimulationElement {
    public readonly id: string;
    public readonly type: SimulationObjectType;
    public readonly version: string;
    public readonly name: string;
    public readonly data: BaseElement;

    constructor(data: BaseElement, version: string = '1.0.0') {
        this.id = data.id;
        this.type = data.type;
        this.name = data.name;
        this.version = version;
        this.data = data;
    }

    validate(): ValidationResult {
        const messages: ValidationMessage[] = [];

        switch (this.type) {
            case SimulationObjectType.Model:
                this.validateModel(this.data as Model, messages);
                break;
            case SimulationObjectType.Activity:
                this.validateActivity(this.data as Activity, messages);
                break;
            case SimulationObjectType.Connector:
                this.validateConnector(this.data as Connector, messages);
                break;
            case SimulationObjectType.Resource:
                this.validateResource(this.data as Resource, messages);
                break;
            case SimulationObjectType.Generator:
                this.validateGenerator(this.data as Generator, messages);
                break;
            case SimulationObjectType.Entity:
                this.validateEntity(this.data as Entity, messages);
                break;
        }

        const errorCount = messages.filter(m => m.type === 'error').length;
        const warningCount = messages.filter(m => m.type === 'warning').length;

        return {
            isValid: errorCount === 0,
            errorCount,
            warningCount,
            messages
        };
    }

    toStorage(): object {
        return {
            ...this.data,
            version: this.version
        };
    }

    fromStorage(data: object): SimulationElement {
        return new SimulationElementWrapper(data as BaseElement, (data as any).version);
    }

    private validateModel(model: Model, messages: ValidationMessage[]): void {
        if (model.reps < 1) {
            messages.push({ type: 'error', message: 'Model must have at least 1 replication', elementId: model.id });
        }
        if (model.forecastDays < 1) {
            messages.push({ type: 'error', message: 'Forecast days must be at least 1', elementId: model.id });
        }
    }

    private validateActivity(activity: Activity, messages: ValidationMessage[]): void {
        if (activity.capacity < 1) {
            messages.push({ type: 'error', message: 'Activity capacity must be at least 1', elementId: activity.id });
        }
        if (!activity.operationSteps || activity.operationSteps.length === 0) {
            messages.push({ type: 'warning', message: 'Activity has no operation steps', elementId: activity.id });
        }
    }

    private validateConnector(connector: Connector, messages: ValidationMessage[]): void {
        if (connector.probability < 0 || connector.probability > 1) {
            messages.push({ type: 'error', message: 'Connector probability must be between 0 and 1', elementId: connector.id });
        }
    }

    private validateResource(resource: Resource, messages: ValidationMessage[]): void {
        if (resource.capacity < 1) {
            messages.push({ type: 'error', message: 'Resource capacity must be at least 1', elementId: resource.id });
        }
    }

    private validateGenerator(generator: Generator, messages: ValidationMessage[]): void {
        if (generator.entitiesPerCreation < 1) {
            messages.push({ type: 'error', message: 'Generator must create at least 1 entity per creation', elementId: generator.id });
        }
        if (!generator.periodIntervalDuration) {
            messages.push({ type: 'error', message: 'Generator must have a period interval duration', elementId: generator.id });
        }
    }

    private validateEntity(entity: Entity, messages: ValidationMessage[]): void {
        if (!entity.name || entity.name.trim().length === 0) {
            messages.push({ type: 'warning', message: 'Entity has no name', elementId: entity.id });
        }
    }
}