import { SimulationElement } from './SimulationElement';
import { Model } from './elements/model';
import { Activity } from './elements/activity';
import { Connector } from './elements/connector';
import { Resource } from './elements/resource';
import { Generator } from './elements/generator';
import { Entity } from './elements/entity';
import { SimulationObjectType } from './elements/enums/simulationObjectType';
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
