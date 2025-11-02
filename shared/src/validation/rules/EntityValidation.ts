import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from "../common/ValidationMessages";
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { Entity } from "../../types/elements/Entity";
import { Generator } from "../../types/elements/Generator";


export class EntityValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const entities = state.modelDefinition.entities.getAll();

        this.log("Starting validation of entities.");

        // Check if there's at least one entity defined
        if (entities.length === 0) {
            this.log("Validation failed: No entities defined.");
            issues.push(ValidationMessages.missingRequiredElement('entity'));
            return;
        }

        // Validate each entity
        entities.forEach((entity: Entity) => {
            this.validateEntityData(entity, issues);
            this.validateEntityUsage(entity, state, issues);
        });

        this.log("Completed validation of entities.");
    }

    private validateEntityData(entity: Entity, issues: ValidationIssue[]): void {
        /**
         * Validates the basic data properties of an entity.
         */

        this.log(`Validating data for Entity ID: ${entity.id}`);

        if (!entity.name || entity.name.trim().length === 0) {
            this.log(`Entity ID ${entity.id} has a missing name.`);
            issues.push(ValidationMessages.missingName('Entity', entity.id, entity.name));
        }

        if (!entity.id || entity.id.trim().length === 0) {
            this.log(`Entity ID ${entity.id} has missing or invalid ID.`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'entity_missing_id',
                `Entity has missing or invalid ID`,
                entity.id
            ));
        }

        if (entity.name === 'New Entity') {
            this.log(`Entity ID ${entity.id} is using the default name.`);

            const displayName = entity.name && entity.name.trim() !== ''
                ? `'${entity.name}'`
                : entity.id;

            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'entity_default_name',
                `Entity ${displayName} is using default name`,
                entity.id
            ));
        }
    }

    private validateEntityUsage(entity: Entity, state: ModelDefinitionState, issues: ValidationIssue[]): void {
        /**
         * Validates the usage of an entity within the model.
         */

        this.log(`Validating usage for Entity ID: ${entity.id}`);

        const isUsedByGenerator = state.modelDefinition.generators.getAll()
            .some((generator: Generator) => generator.entityId === entity.id);

        if (!isUsedByGenerator) {
            this.log(`Entity ID ${entity.id} is not used by any generator.`);

            const displayName = entity.name && entity.name.trim() !== ''
                ? `'${entity.name}'`
                : entity.id;

            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'entity_not_used',
                `Entity ${displayName} is not used by any generator`,
                entity.id
            ));
        }

        const entities = state.modelDefinition.entities.getAll();
        const duplicateNames = entities.filter((e: Entity) =>
            e.id !== entity.id && e.name.trim().toLowerCase() === entity.name.trim().toLowerCase()
        );

        if (duplicateNames.length > 0) {
            this.log(`Entity ID ${entity.id} has a name conflict with other entities.`);

            const displayName = entity.name && entity.name.trim() !== ''
                ? `'${entity.name}'`
                : entity.id;

            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'entity_name_conflict',
                `Entity ${displayName} has a name that conflicts with other entities`,
                entity.id
            ));
        }
    }
}
