import { SimulationElement } from './SimulationElement';
import { Model } from './elements/Model';
import { Activity } from './elements/Activity';
import { Connector } from './elements/Connector';
import { Resource } from './elements/Resource';
import { Generator } from './elements/Generator';
import { Entity } from './elements/Entity';
import { SimulationObjectType } from './elements/SimulationObjectType';
export declare const SimulationElementFactory: {
    readonly createElement: (metadata: {
        type: SimulationObjectType;
    }, data: any) => SimulationElement;
    readonly createModel: (data: any) => Model;
    readonly createActivity: (data: any) => Activity;
    readonly createConnector: (data: any) => Connector;
    readonly createResource: (data: any) => Resource;
    readonly createGenerator: (data: any) => Generator;
    readonly createEntity: (data: any) => Entity;
};
