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
        // Check for outgoing connections using the connections map
        const hasOutgoingConnections = Array.from(state.connections.values())
            .some(connection => connection.sourceId === generator.id);

        if (!hasOutgoingConnections) {
            messages.push(ValidationMessages.isolatedElement('Generator', generator.id));
        }
    }

    private validateGeneratorData(
        generator: Generator,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        // Validate name
        if (!generator.name || generator.name.trim().length === 0) {
            messages.push(ValidationMessages.missingName('Generator', generator.id));
        }

        // Validate entities per creation
        if (typeof generator.entitiesPerCreation !== 'number' ||
            generator.entitiesPerCreation < GeneratorValidation.MIN_ENTITIES_PER_CREATION ||
            generator.entitiesPerCreation > GeneratorValidation.MAX_ENTITIES_PER_CREATION) {
            messages.push(ValidationMessages.generatorValidation(
                'entities per creation',
                generator.id,
                `Must be between ${GeneratorValidation.MIN_ENTITIES_PER_CREATION} and ${GeneratorValidation.MAX_ENTITIES_PER_CREATION}`
            ));
        }

        // Validate periodicOccurrences
        if (generator.periodicOccurrences !== Infinity &&
            (typeof generator.periodicOccurrences !== 'number' ||
            generator.periodicOccurrences < GeneratorValidation.MIN_PERIODIC_OCCURRENCES)) {
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
                messages.push({
                    type: 'error',
                    message: `Generator ${generator.id} references non-existent activity ${generator.activityKeyId}`,
                    elementId: generator.id
                });
            }
        }
    }

    private validateDurationSettings(
        generator: Generator,
        messages: ValidationMessage[]
    ): void {
        // Validate period interval duration
        if (!generator.periodIntervalDuration || !generator.periodIntervalDuration.durationLength) {
            messages.push(ValidationMessages.generatorValidation(
                'period interval duration',
                generator.id,
                'Must have a valid duration length'
            ));
        }

        // Validate periodic start duration
        if (!generator.periodicStartDuration || !generator.periodicStartDuration.durationLength) {
            messages.push(ValidationMessages.generatorValidation(
                'periodic start duration',
                generator.id,
                'Must have a valid duration length'
            ));
        }

        // Check for logical duration conflicts
        if (generator.periodIntervalDuration?.durationLength && generator.periodicStartDuration?.durationLength) {
            if (generator.periodicStartDuration.durationLength > generator.periodIntervalDuration.durationLength) {
                messages.push({
                    type: 'warning',
                    message: `Generator ${generator.id} has start duration longer than interval duration`,
                    elementId: generator.id
                });
            }
        }
    }

    private validateEntitySettings(
        generator: Generator,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        // Validate entity ID reference
        if (!generator.entityId) {
            messages.push(ValidationMessages.generatorValidation(
                'entity reference',
                generator.id,
                'Must specify an entity ID'
            ));
        } else {
            const entityExists = state.modelDefinition.entities.get(generator.entityId);
            if (!entityExists) {
                messages.push(ValidationMessages.generatorValidation(
                    'entity reference',
                    generator.id,
                    `References non-existent entity ${generator.entityId}`
                ));
            }
        }

        // Validate entity creation constraints
        if (generator.periodicOccurrences !== Infinity && generator.maxEntities !== Infinity) {
            const totalEntities = generator.periodicOccurrences * generator.entitiesPerCreation;
            if (totalEntities > generator.maxEntities) {
                messages.push({
                    type: 'warning',
                    message: `Generator ${generator.id} may reach maximum entities limit before completing all periodic occurrences`,
                    elementId: generator.id
                });
            }
        }
    }

    private validateGeneratorInteractions(
        generators: Generator[],
        messages: ValidationMessage[]
    ): void {
        // Check for overlapping start times
        const startTimes = new Map<number, Generator[]>();

        generators.forEach(generator => {
            const startTime = generator.periodicStartDuration?.durationLength || 0;
            const existingGenerators = startTimes.get(startTime) || [];
            existingGenerators.push(generator);
            startTimes.set(startTime, existingGenerators);
        });

        startTimes.forEach((overlappingGenerators, startTime) => {
            if (overlappingGenerators.length > 1) {
                messages.push({
                    type: 'warning',
                    message: `Multiple generators (${overlappingGenerators.map(g => g.id).join(', ')}) start at the same time (${startTime})`,
                    elementId: overlappingGenerators[0].id
                });
            }
        });

        // Check for potential system overload
        let totalEntitiesPerSecond = 0;
        generators.forEach(generator => {
            if (generator.periodIntervalDuration?.durationLength) {
                const generatorRate = generator.entitiesPerCreation / generator.periodIntervalDuration.durationLength;
                totalEntitiesPerSecond += generatorRate;
            }
        });

        if (totalEntitiesPerSecond > 1000) { // Arbitrary threshold, adjust as needed
            messages.push({
                type: 'warning',
                message: `High entity generation rate detected (${totalEntitiesPerSecond.toFixed(2)} entities/second)`,
                elementId: generators[0]?.id
            });
        }
    }
}