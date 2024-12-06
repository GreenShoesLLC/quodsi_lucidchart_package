import { ActivityListManager } from "./ActivityListManager";
import { ConnectorListManager } from "./ConnectorListManager";
import { Entity } from "./Entity";
import { EntityListManager } from "./EntityListManager";
import { GeneratorListManager } from "./GeneratorListManager";
import { Model } from "./Model";
import { ModelDefaults } from "./ModelDefaults";
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
        // Add default entity
        const defaultEntity = new Entity(
            ModelDefaults.DEFAULT_ENTITY_ID,
            ModelDefaults.DEFAULT_ENTITY_NAME
        );
        this.entities.add(defaultEntity);
    }

    get id(): string { return this.model.id; }
    get name(): string { return this.model.name; }
}