import { SimulationElement } from './SimulationElement';
import { Model } from './elements/Model';
import { Activity } from './elements/Activity';
import { Connector } from './elements/Connector';
import { Resource } from './elements/Resource';
import { Generator } from './elements/Generator';
import { Entity } from './elements/Entity';
import { SimulationObjectType } from './elements/SimulationObjectType';
import { ValidationResult } from './ValidationTypes';
type BaseElement = Model | Activity | Connector | Resource | Generator | Entity;
export declare class SimulationElementWrapper implements SimulationElement {
    readonly id: string;
    readonly type: SimulationObjectType;
    readonly version: string;
    readonly data: BaseElement;
    constructor(data: BaseElement, version?: string);
    validate(): ValidationResult;
    toStorage(): object;
    fromStorage(data: object): SimulationElement;
    private validateModel;
    private validateActivity;
    private validateConnector;
    private validateResource;
    private validateGenerator;
    private validateEntity;
}
export {};
