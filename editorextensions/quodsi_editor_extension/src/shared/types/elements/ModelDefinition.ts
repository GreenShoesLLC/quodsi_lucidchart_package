import { ActivityListManager } from "./ActivityListManager";
import { ConnectorListManager } from "./ConnectorListManager";
import { EntityListManager } from "./EntityListManager";
import { GeneratorListManager } from "./GeneratorListManager";
import { Model } from "./Model";
import { ResourceListManager } from "./ResourceListManager";

export class ModelDefinition {
    public readonly activities: ActivityListManager;
    public readonly connectors: ConnectorListManager;
    public readonly resources: ResourceListManager;
    public readonly generators: GeneratorListManager;
    public readonly entities: EntityListManager;

    constructor(
        public readonly model: Model
    ) {
        this.activities = new ActivityListManager();
        this.connectors = new ConnectorListManager();
        this.resources = new ResourceListManager();
        this.generators = new GeneratorListManager();
        this.entities = new EntityListManager();
    }

    get id(): string { return this.model.id; }
    get name(): string { return this.model.name; }
}