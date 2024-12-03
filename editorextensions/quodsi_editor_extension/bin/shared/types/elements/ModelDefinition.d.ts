import { ActivityListManager } from "./ActivityListManager";
import { ConnectorListManager } from "./ConnectorListManager";
import { EntityListManager } from "./EntityListManager";
import { GeneratorListManager } from "./GeneratorListManager";
import { Model } from "./Model";
import { ResourceListManager } from "./ResourceListManager";
export declare class ModelDefinition {
    readonly model: Model;
    readonly activities: ActivityListManager;
    readonly connectors: ConnectorListManager;
    readonly resources: ResourceListManager;
    readonly generators: GeneratorListManager;
    readonly entities: EntityListManager;
    constructor(model: Model);
    get id(): string;
    get name(): string;
}
