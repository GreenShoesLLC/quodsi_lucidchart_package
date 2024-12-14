import { ValidationRule } from "./ValidationRule";
import { ValidationMessage, Entity } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
import { ValidationMessages } from "./ValidationMessages";

export class EntityValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const entities = state.modelDefinition.entities.getAll();

        this.log("Starting validation of entities.");

        // Check if there's at least one entity defined
        if (entities.length === 0) {
            this.log("Validation failed: No entities defined.");
            messages.push(ValidationMessages.missingRequiredElement('entity'));
            return;
        }

        // Validate each entity
        entities.forEach(entity => {
            this.validateEntityData(entity, messages);
            this.validateEntityUsage(entity, state, messages);
        });

        this.log("Completed validation of entities.");
    }

    private validateEntityData(entity: Entity, messages: ValidationMessage[]): void {
        /**
         * Validates the basic data properties of an entity.
         */

        this.log(`Validating data for Entity ID: ${entity.id}`);

        if (!entity.name || entity.name.trim().length === 0) {
            this.log(`Entity ID ${entity.id} has a missing name.`);
            messages.push(ValidationMessages.missingName('Entity', entity.id));
        }

        if (!entity.id || entity.id.trim().length === 0) {
            this.log(`Entity ID ${entity.id} has missing or invalid ID.`);
            messages.push({
                type: 'error',
                message: `Entity has missing or invalid ID`,
                elementId: entity.id
            });
        }

        if (entity.name === 'New Entity') {
            this.log(`Entity ID ${entity.id} is using the default name.`);
            messages.push({
                type: 'warning',
                message: `Entity ${entity.id} is using default name`,
                elementId: entity.id
            });
        }
    }

    private validateEntityUsage(entity: Entity, state: ModelDefinitionState, messages: ValidationMessage[]): void {
        /**
         * Validates the usage of an entity within the model.
         */

        this.log(`Validating usage for Entity ID: ${entity.id}`);

        const isUsedByGenerator = state.modelDefinition.generators.getAll()
            .some(generator => generator.entityId === entity.id);

        if (!isUsedByGenerator) {
            this.log(`Entity ID ${entity.id} is not used by any generator.`);
            messages.push({
                type: 'warning',
                message: `Entity ${entity.id} is not used by any generator`,
                elementId: entity.id
            });
        }

        const entities = state.modelDefinition.entities.getAll();
        const duplicateNames = entities.filter(e =>
            e.id !== entity.id && e.name.trim().toLowerCase() === entity.name.trim().toLowerCase()
        );

        if (duplicateNames.length > 0) {
            this.log(`Entity ID ${entity.id} has a name conflict with other entities.`);
            messages.push({
                type: 'warning',
                message: `Entity ${entity.id} has a name that conflicts with other entities`,
                elementId: entity.id
            });
        }
    }
}
