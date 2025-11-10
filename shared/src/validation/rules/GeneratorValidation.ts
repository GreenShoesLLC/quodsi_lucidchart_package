import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from '../common/ValidationMessages';
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { Generator } from "../../types/elements/Generator";


export class GeneratorValidation extends ValidationRule {
    // Constants for validation limits
    private static readonly MIN_ENTITIES_PER_CREATION = 1;
    private static readonly MAX_ENTITIES_PER_CREATION = 1000;
    private static readonly MIN_PERIODIC_OCCURRENCES = 1;
    private static readonly MIN_MAX_ENTITIES = 1;
    private static readonly MAX_MAX_ENTITIES = 1000000;

    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const generators = state.modelDefinition.generators.getAll();

        generators.forEach((generator: Generator) => {
            this.validateGeneratorData(generator, state, issues);
            this.validateDurationSettings(generator, issues);
            this.validateEntitySettings(generator, state, issues);
        });

        this.validateGeneratorInteractions(generators, issues);
    }

    private validateGeneratorData(
        generator: Generator,
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates the data properties of a given Generator.
         * Ensures the Generator has a valid name, valid entities per creation,
         * periodic occurrences, max entities constraints, and referenced activity key IDs exist.
         */

        this.log(`Starting validation for Generator ID: ${generator.id}, Name: ${generator.name}`);

        // Validate the Generator's name
        if (!generator.name || generator.name.trim().length === 0) {
            this.log(`Validation failed: Generator ID ${generator.id} has an empty or missing name.`);
            issues.push(ValidationMessages.missingName('Generator', generator.id, generator.name));
        }

        // Validate entities per creation
        if (typeof generator.entitiesPerCreation !== 'number' ||
            generator.entitiesPerCreation < GeneratorValidation.MIN_ENTITIES_PER_CREATION ||
            generator.entitiesPerCreation > GeneratorValidation.MAX_ENTITIES_PER_CREATION) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid entitiesPerCreation (${generator.entitiesPerCreation}).`);
            issues.push(ValidationMessages.generatorValidation(
                'entities per creation',
                generator.id,
                `Must be between ${GeneratorValidation.MIN_ENTITIES_PER_CREATION} and ${GeneratorValidation.MAX_ENTITIES_PER_CREATION}`,
                generator.name
            ));
        }

        // Validate periodic occurrences
        if (generator.periodicOccurrences !== Infinity &&
            (typeof generator.periodicOccurrences !== 'number' ||
                generator.periodicOccurrences < GeneratorValidation.MIN_PERIODIC_OCCURRENCES)) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid periodicOccurrences (${generator.periodicOccurrences}).`);
            issues.push(ValidationMessages.generatorValidation(
                'periodic occurrences',
                generator.id,
                'Must be Infinity or a number greater than 0',
                generator.name
            ));
        }

        // Validate maxEntities
        if (generator.maxEntities !== Infinity &&
            (typeof generator.maxEntities !== 'number' ||
                generator.maxEntities < GeneratorValidation.MIN_MAX_ENTITIES ||
                generator.maxEntities > GeneratorValidation.MAX_MAX_ENTITIES)) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid maxEntities (${generator.maxEntities}).`);
            issues.push(ValidationMessages.generatorValidation(
                'maximum entities limit',
                generator.id,
                `Must be Infinity or between ${GeneratorValidation.MIN_MAX_ENTITIES} and ${GeneratorValidation.MAX_MAX_ENTITIES}`,
                generator.name
            ));
        }

        this.log(`Completed validation for Generator ID: ${generator.id}`);
    }

    private validateDurationSettings(
        generator: Generator,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates the duration settings of a Generator.
         * Ensures that the period interval duration and start duration are valid and logically consistent.
         */

        this.log(`Starting duration settings validation for Generator ID: ${generator.id}`);

        // if (!generator.periodIntervalDuration || generator.periodIntervalDuration.durationLength < 0) {
        //     this.log(`Validation failed: Generator ID ${generator.id} has invalid period interval duration.`);
        //     issues.push(ValidationMessages.generatorValidation(
        //         'period interval duration',
        //         generator.id,
        //         'Must have a valid duration length'
        //     ));
        // }

        // if (!generator.periodicStartDuration || generator.periodicStartDuration.durationLength < 0) {
        //     this.log(`Validation failed: Generator ID ${generator.id} has invalid periodic start duration.`);
        //     issues.push(ValidationMessages.generatorValidation(
        //         'periodic start duration',
        //         generator.id,
        //         'Must have a valid duration length'
        //     ));
        // }

        // if (generator.periodIntervalDuration?.durationLength && generator.periodicStartDuration?.durationLength) {
        //     if (generator.periodicStartDuration.durationLength > generator.periodIntervalDuration.durationLength) {
        //         this.log(`Warning: Generator ID ${generator.id} has start duration longer than interval duration.`);
        //         issues.push({
        //             type: 'warning',
        //             message: `Generator ${generator.id} has start duration longer than interval duration`,
        //             elementId: generator.id
        //         });
        //     }
        // }

        this.log(`Completed duration settings validation for Generator ID: ${generator.id}`);
    }

    private validateEntitySettings(
        generator: Generator,
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates the entity-related settings of a Generator.
         * Ensures entity references exist and constraints on entity creation are valid.
         */

        this.log(`Starting entity settings validation for Generator ID: ${generator.id}`);

        if (!generator.entityId) {
            this.log(`Validation failed: Generator ID ${generator.id} does not specify an entity ID.`);
            issues.push(ValidationMessages.generatorValidation(
                'entity reference',
                generator.id,
                'Must specify an entity ID',
                generator.name
            ));
        } else {
            const entityExists = state.modelDefinition.entities.get(generator.entityId);
            if (!entityExists) {
                this.log(`Validation failed: Generator ID ${generator.id} references a non-existent entity (${generator.entityId}).`);
                issues.push(ValidationMessages.generatorValidation(
                    'entity reference',
                    generator.id,
                    `References non-existent entity ${generator.entityId}`,
                    generator.name
                ));
            }
        }

        if (generator.periodicOccurrences !== Infinity && generator.maxEntities !== Infinity) {
            const totalEntities = generator.periodicOccurrences * generator.entitiesPerCreation;
            if (totalEntities > generator.maxEntities) {
                this.log(`Warning: Generator ID ${generator.id} may exceed maximum entities limit.`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.WARNING,
                    'generator_max_entities_limit',
                    `Generator ${generator.id} may reach maximum entities limit before completing all periodic occurrences`,
                    generator.id
                ));
            }
        }

        this.log(`Completed entity settings validation for Generator ID: ${generator.id}`);
    }

    private validateGeneratorInteractions(
        generators: Generator[],
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates interactions among multiple Generators.
         * Checks for overlapping start times and potential system overload due to high entity generation rates.
         */

        this.log(`Starting generator interactions validation.`);

        const startTimes = new Map<number, Generator[]>();

        // generators.forEach(generator => {
        //     const startTime = generator.periodicStartDuration?.durationLength || 0;
        //     const existingGenerators = startTimes.get(startTime) || [];
        //     existingGenerators.push(generator);
        //     startTimes.set(startTime, existingGenerators);
        // });

        // startTimes.forEach((overlappingGenerators, startTime) => {
        //     if (overlappingGenerators.length > 1) {
        //         this.log(`Warning: Overlapping start times detected for Generators: ${overlappingGenerators.map(g => g.id).join(', ')} at time ${startTime}.`);
        //         issues.push({
        //             type: 'warning',
        //             message: `Multiple generators (${overlappingGenerators.map(g => g.id).join(', ')}) start at the same time (${startTime})`,
        //             elementId: overlappingGenerators[0].id
        //         });
        //     }
        // });

        let totalEntitiesPerSecond = 0;
        // generators.forEach(generator => {
        //     if (generator.periodIntervalDuration?.durationLength) {
        //         const generatorRate = generator.entitiesPerCreation / generator.periodIntervalDuration.durationLength;
        //         totalEntitiesPerSecond += generatorRate;
        //     }
        // });

        if (totalEntitiesPerSecond > 1000) {
            this.log(`Warning: High entity generation rate detected (${totalEntitiesPerSecond.toFixed(2)} entities/second).`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'high_entity_generation_rate',
                `High entity generation rate detected (${totalEntitiesPerSecond.toFixed(2)} entities/second)`,
                generators[0]?.id
            ));
        }

        this.log(`Completed generator interactions validation.`);
    }
}
