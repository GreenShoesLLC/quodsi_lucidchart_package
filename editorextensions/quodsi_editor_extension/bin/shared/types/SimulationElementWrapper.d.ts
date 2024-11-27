import { SimulationElement } from './SimulationElement';
import { Model } from './elements/model';
import { Activity } from './elements/activity';
import { Connector } from './elements/connector';
import { Resource } from './elements/resource';
import { Generator } from './elements/generator';
import { Entity } from './elements/entity';
import { SimulationObjectType } from './elements/enums/simulationObjectType';
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
