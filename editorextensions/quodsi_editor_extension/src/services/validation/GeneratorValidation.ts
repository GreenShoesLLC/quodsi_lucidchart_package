import { ValidationRule } from './ValidationRule';
import { ValidationMessage, Generator } from '@quodsi/shared';
import { ModelDefinitionState } from './ModelDefinitionState';
import { ValidationMessages } from './ValidationMessages';

export class GeneratorValidation extends ValidationRule {
    // Constants for validation limits
    private static readonly MIN_ENTITIES_PER_CREATION = 1;
    private static readonly MAX_ENTITIES_PER_CREATION = 1000;
    private static readonly MIN_PERIODIC_OCCURRENCES = 1;
    private static readonly MIN_MAX_ENTITIES = 1;
    private static readonly MAX_MAX_ENTITIES = 1000000;

    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const generators = state.modelDefinition.generators.getAll();

        generators.forEach(generator => {
            this.validateGeneratorConnectivity(generator, state, messages);
            this.validateGeneratorData(generator, state, messages);
            this.validateDurationSettings(generator, messages);
            this.validateEntitySettings(generator, state, messages);
        });

        this.validateGeneratorInteractions(generators, messages);
    }

    private validateGeneratorConnectivity(
        generator: Generator,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates the connectivity of a Generator to ensure it has at least one outgoing connection.
         * Logs the validation process and any connectivity issues if logging is enabled.
         */

        this.log(`Starting connectivity validation for Generator ID: ${generator.id}, Name: ${generator.name}`);

        // Check for outgoing connections using the connections map
        const hasOutgoingConnections = Array.from(state.connections.values())
            .some(connection => connection.sourceId === generator.id);

        if (!hasOutgoingConnections) {
            this.log(`Validation failed: Generator ID ${generator.id} has no outgoing connections.`);
            messages.push(ValidationMessages.isolatedElement('Generator', generator.id));
        } else {
            this.log(`Validation passed: Generator ID ${generator.id} has outgoing connections.`);
        }

        this.log(`Completed connectivity validation for Generator ID: ${generator.id}`);
    }

    private validateGeneratorData(
        generator: Generator,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
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
            messages.push(ValidationMessages.missingName('Generator', generator.id));
        }

        // Validate entities per creation
        if (typeof generator.entitiesPerCreation !== 'number' ||
            generator.entitiesPerCreation < GeneratorValidation.MIN_ENTITIES_PER_CREATION ||
            generator.entitiesPerCreation > GeneratorValidation.MAX_ENTITIES_PER_CREATION) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid entitiesPerCreation (${generator.entitiesPerCreation}).`);
            messages.push(ValidationMessages.generatorValidation(
                'entities per creation',
                generator.id,
                `Must be between ${GeneratorValidation.MIN_ENTITIES_PER_CREATION} and ${GeneratorValidation.MAX_ENTITIES_PER_CREATION}`
            ));
        }

        // Validate periodic occurrences
        if (generator.periodicOccurrences !== Infinity &&
            (typeof generator.periodicOccurrences !== 'number' ||
                generator.periodicOccurrences < GeneratorValidation.MIN_PERIODIC_OCCURRENCES)) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid periodicOccurrences (${generator.periodicOccurrences}).`);
            messages.push(ValidationMessages.generatorValidation(
                'periodic occurrences',
                generator.id,
                'Must be Infinity or a number greater than 0'
            ));
        }

        // Validate maxEntities
        if (generator.maxEntities !== Infinity &&
            (typeof generator.maxEntities !== 'number' ||
                generator.maxEntities < GeneratorValidation.MIN_MAX_ENTITIES ||
                generator.maxEntities > GeneratorValidation.MAX_MAX_ENTITIES)) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid maxEntities (${generator.maxEntities}).`);
            messages.push(ValidationMessages.generatorValidation(
                'maximum entities limit',
                generator.id,
                `Must be Infinity or between ${GeneratorValidation.MIN_MAX_ENTITIES} and ${GeneratorValidation.MAX_MAX_ENTITIES}`
            ));
        }

        // Validate activity key ID if specified
        if (generator.activityKeyId) {
            const activityExists = state.modelDefinition.activities.get(generator.activityKeyId);
            if (!activityExists) {
                this.log(`Validation failed: Generator ID ${generator.id} references a non-existent activity (${generator.activityKeyId}).`);
                messages.push({
                    type: 'error',
                    message: `Generator ${generator.id} references non-existent activity ${generator.activityKeyId}`,
                    elementId: generator.id
                });
            }
        }

        this.log(`Completed validation for Generator ID: ${generator.id}`);
    }

    private validateDurationSettings(
        generator: Generator,
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates the duration settings of a Generator.
         * Ensures that the period interval duration and start duration are valid and logically consistent.
         */

        this.log(`Starting duration settings validation for Generator ID: ${generator.id}`);

        if (!generator.periodIntervalDuration || !generator.periodIntervalDuration.durationLength) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid period interval duration.`);
            messages.push(ValidationMessages.generatorValidation(
                'period interval duration',
                generator.id,
                'Must have a valid duration length'
            ));
        }

        if (!generator.periodicStartDuration || !generator.periodicStartDuration.durationLength) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid periodic start duration.`);
            messages.push(ValidationMessages.generatorValidation(
                'periodic start duration',
                generator.id,
                'Must have a valid duration length'
            ));
        }

        if (generator.periodIntervalDuration?.durationLength && generator.periodicStartDuration?.durationLength) {
            if (generator.periodicStartDuration.durationLength > generator.periodIntervalDuration.durationLength) {
                this.log(`Warning: Generator ID ${generator.id} has start duration longer than interval duration.`);
                messages.push({
                    type: 'warning',
                    message: `Generator ${generator.id} has start duration longer than interval duration`,
                    elementId: generator.id
                });
            }
        }

        this.log(`Completed duration settings validation for Generator ID: ${generator.id}`);
    }

    private validateEntitySettings(
        generator: Generator,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates the entity-related settings of a Generator.
         * Ensures entity references exist and constraints on entity creation are valid.
         */

        this.log(`Starting entity settings validation for Generator ID: ${generator.id}`);

        if (!generator.entityId) {
            this.log(`Validation failed: Generator ID ${generator.id} does not specify an entity ID.`);
            messages.push(ValidationMessages.generatorValidation(
                'entity reference',
                generator.id,
                'Must specify an entity ID'
            ));
        } else {
            const entityExists = state.modelDefinition.entities.get(generator.entityId);
            if (!entityExists) {
                this.log(`Validation failed: Generator ID ${generator.id} references a non-existent entity (${generator.entityId}).`);
                messages.push(ValidationMessages.generatorValidation(
                    'entity reference',
                    generator.id,
                    `References non-existent entity ${generator.entityId}`
                ));
            }
        }

        if (generator.periodicOccurrences !== Infinity && generator.maxEntities !== Infinity) {
            const totalEntities = generator.periodicOccurrences * generator.entitiesPerCreation;
            if (totalEntities > generator.maxEntities) {
                this.log(`Warning: Generator ID ${generator.id} may exceed maximum entities limit.`);
                messages.push({
                    type: 'warning',
                    message: `Generator ${generator.id} may reach maximum entities limit before completing all periodic occurrences`,
                    elementId: generator.id
                });
            }
        }

        this.log(`Completed entity settings validation for Generator ID: ${generator.id}`);
    }

    private validateGeneratorInteractions(
        generators: Generator[],
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates interactions among multiple Generators.
         * Checks for overlapping start times and potential system overload due to high entity generation rates.
         */

        this.log(`Starting generator interactions validation.`);

        const startTimes = new Map<number, Generator[]>();

        generators.forEach(generator => {
            const startTime = generator.periodicStartDuration?.durationLength || 0;
            const existingGenerators = startTimes.get(startTime) || [];
            existingGenerators.push(generator);
            startTimes.set(startTime, existingGenerators);
        });

        startTimes.forEach((overlappingGenerators, startTime) => {
            if (overlappingGenerators.length > 1) {
                this.log(`Warning: Overlapping start times detected for Generators: ${overlappingGenerators.map(g => g.id).join(', ')} at time ${startTime}.`);
                messages.push({
                    type: 'warning',
                    message: `Multiple generators (${overlappingGenerators.map(g => g.id).join(', ')}) start at the same time (${startTime})`,
                    elementId: overlappingGenerators[0].id
                });
            }
        });

        let totalEntitiesPerSecond = 0;
        generators.forEach(generator => {
            if (generator.periodIntervalDuration?.durationLength) {
                const generatorRate = generator.entitiesPerCreation / generator.periodIntervalDuration.durationLength;
                totalEntitiesPerSecond += generatorRate;
            }
        });

        if (totalEntitiesPerSecond > 1000) {
            this.log(`Warning: High entity generation rate detected (${totalEntitiesPerSecond.toFixed(2)} entities/second).`);
            messages.push({
                type: 'warning',
                message: `High entity generation rate detected (${totalEntitiesPerSecond.toFixed(2)} entities/second)`,
                elementId: generators[0]?.id
            });
        }

        this.log(`Completed generator interactions validation.`);
    }
}
