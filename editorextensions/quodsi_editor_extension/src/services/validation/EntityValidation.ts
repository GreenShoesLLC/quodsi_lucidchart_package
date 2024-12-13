import { ValidationRule } from "./ValidationRule";
import { ValidationMessage, Entity } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
import { ValidationMessages } from "./ValidationMessages";

export class EntityValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const entities = state.modelDefinition.entities.getAll();

        // Check if there's at least one entity defined
        if (entities.length === 0) {
            messages.push(ValidationMessages.missingRequiredElement('entity'));
            return;
        }

        // Validate each entity
        entities.forEach(entity => {
            this.validateEntityData(entity, messages);
            this.validateEntityUsage(entity, state, messages);
        });
    }

    private validateEntityData(entity: Entity, messages: ValidationMessage[]): void {
        // Validate entity has a name
        if (!entity.name || entity.name.trim().length === 0) {
            messages.push(ValidationMessages.missingName('Entity', entity.id));
        }

        // Validate entity ID format (if you have specific requirements)
        if (!entity.id || entity.id.trim().length === 0) {
            messages.push({
                type: 'error',
                message: `Entity has missing or invalid ID`,
                elementId: entity.id
            });
        }

        // Check for default entity name unchanged
        if (entity.name === 'New Entity') {
            messages.push({
                type: 'warning',
                message: `Entity ${entity.id} is using default name`,
                elementId: entity.id
            });
        }
    }

    private validateEntityUsage(entity: Entity, state: ModelDefinitionState, messages: ValidationMessage[]): void {
        // Check if the entity is used by any generators
        const isUsedByGenerator = state.modelDefinition.generators.getAll()
            .some(generator => generator.entityId === entity.id);

        if (!isUsedByGenerator) {
            messages.push({
                type: 'warning',
                message: `Entity ${entity.id} is not used by any generator`,
                elementId: entity.id
            });
        }

        // Check for duplicate entity names
        const entities = state.modelDefinition.entities.getAll();
        const duplicateNames = entities.filter(e =>
            e.id !== entity.id && e.name.trim().toLowerCase() === entity.name.trim().toLowerCase()
        );

        if (duplicateNames.length > 0) {
            messages.push({
                type: 'warning',
                message: `Entity ${entity.id} has a name that conflicts with other entities`,
                elementId: entity.id
            });
        }
    }
}