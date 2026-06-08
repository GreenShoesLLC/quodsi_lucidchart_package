import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from '../common/ValidationMessages';
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { Generator } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ConstantParameters } from "../../types/elements/distributions/ConstantDistribution";
import { Duration } from '@quodsi/shared';


export class GeneratorValidation extends ValidationRule {
    // Constants for validation limits
    private static readonly MIN_ENTITIES_PER_CREATION = 1;
    private static readonly MAX_ENTITIES_PER_CREATION = 1000;
    private static readonly MIN_PERIODIC_OCCURRENCES = 1;
    private static readonly MIN_MAX_ENTITIES = 1;
    private static readonly MAX_MAX_ENTITIES = 1000000;

    /**
     * Helper to extract a numeric value from a Duration.
     * For constant distributions, returns the value.
     * For other distributions, returns the mean/expected value if determinable.
     * Returns undefined if duration is invalid or value cannot be determined.
     */
    private getDurationValue(duration: Duration | undefined): number | undefined {
        if (!duration?.distribution) {
            return undefined;
        }

        const dist = duration.distribution;
        if (dist.distributionType === DistributionType.CONSTANT) {
            const params = dist.parameters as ConstantParameters;
            return params?.value;
        }

        // For non-constant distributions, we could add mean calculations here
        // For now, return undefined (skip validation for stochastic durations)
        return undefined;
    }

    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const generators = state.modelDefinition.generators.getAll();

        generators.forEach((generator: Generator) => {
            // Check for missing generationConfig
            if (!generator.generationConfig) {
                this.log(`Validation failed: Generator ID ${generator.id} has no generationConfig.`);
                issues.push(ValidationMessages.generatorValidation(
                    'configuration',
                    generator.id,
                    'Generator is missing generationConfig - please re-edit and save',
                    generator.name
                ));
                return; // Skip further validation for this generator
            }

            this.validateGeneratorData(generator, state, issues);
            this.validateDurationSettings(generator, issues);
            this.validateEntitySettings(generator, state, issues);
            this.validateExitConnector(generator, state, issues);
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
        if (typeof generator.generationConfig.entitiesPerCreation !== 'number' ||
            generator.generationConfig.entitiesPerCreation < GeneratorValidation.MIN_ENTITIES_PER_CREATION ||
            generator.generationConfig.entitiesPerCreation > GeneratorValidation.MAX_ENTITIES_PER_CREATION) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid entitiesPerCreation (${generator.generationConfig.entitiesPerCreation}).`);
            issues.push(ValidationMessages.generatorValidation(
                'entities per creation',
                generator.id,
                `Must be between ${GeneratorValidation.MIN_ENTITIES_PER_CREATION} and ${GeneratorValidation.MAX_ENTITIES_PER_CREATION}`,
                generator.name
            ));
        }

        // Validate periodic occurrences
        if (generator.generationConfig.periodicOccurrences !== Infinity &&
            (typeof generator.generationConfig.periodicOccurrences !== 'number' ||
                generator.generationConfig.periodicOccurrences < GeneratorValidation.MIN_PERIODIC_OCCURRENCES)) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid periodicOccurrences (${generator.generationConfig.periodicOccurrences}).`);
            issues.push(ValidationMessages.generatorValidation(
                'periodic occurrences',
                generator.id,
                'Must be Infinity or a number greater than 0',
                generator.name
            ));
        }

        // Validate maxEntities
        if (generator.generationConfig.maxEntities !== Infinity &&
            (typeof generator.generationConfig.maxEntities !== 'number' ||
                generator.generationConfig.maxEntities < GeneratorValidation.MIN_MAX_ENTITIES ||
                generator.generationConfig.maxEntities > GeneratorValidation.MAX_MAX_ENTITIES)) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid maxEntities (${generator.generationConfig.maxEntities}).`);
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

        const config = generator.generationConfig;

        // Validate period interval duration exists and has valid distribution
        if (!config.periodIntervalDuration?.distribution) {
            this.log(`Validation failed: Generator ID ${generator.id} has invalid period interval duration.`);
            issues.push(ValidationMessages.generatorValidation(
                'period interval duration',
                generator.id,
                'Must have a valid duration with distribution',
                generator.name
            ));
        } else {
            // For constant distributions, validate the value is non-negative
            const intervalValue = this.getDurationValue(config.periodIntervalDuration);
            if (intervalValue !== undefined && intervalValue < 0) {
                this.log(`Validation failed: Generator ID ${generator.id} has negative period interval duration.`);
                issues.push(ValidationMessages.generatorValidation(
                    'period interval duration',
                    generator.id,
                    'Duration value must be non-negative',
                    generator.name
                ));
            }
        }

        // Validate periodic start duration if present
        if (config.periodicStartDuration?.distribution) {
            const startValue = this.getDurationValue(config.periodicStartDuration);
            if (startValue !== undefined && startValue < 0) {
                this.log(`Validation failed: Generator ID ${generator.id} has negative periodic start duration.`);
                issues.push(ValidationMessages.generatorValidation(
                    'periodic start duration',
                    generator.id,
                    'Duration value must be non-negative',
                    generator.name
                ));
            }

            // Warn if start duration is longer than interval (only for constant durations)
            const intervalValue = this.getDurationValue(config.periodIntervalDuration);
            if (intervalValue !== undefined && startValue !== undefined) {
                if (startValue > intervalValue && intervalValue > 0) {
                    this.log(`Warning: Generator ID ${generator.id} has start duration longer than interval duration.`);
                    issues.push(ValidationMessages.createIssue(
                        ValidationSeverity.WARNING,
                        'generator_start_exceeds_interval',
                        `Generator '${generator.name}' has start delay (${startValue}) longer than interval (${intervalValue})`,
                        generator.id
                    ));
                }
            }
        }

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

        if (!generator.generationConfig.entityId) {
            this.log(`Validation failed: Generator ID ${generator.id} does not specify an entity ID.`);
            issues.push(ValidationMessages.generatorValidation(
                'entity reference',
                generator.id,
                'Must specify an entity ID',
                generator.name
            ));
        } else {
            const entityExists = state.modelDefinition.entities.get(generator.generationConfig.entityId);
            if (!entityExists) {
                this.log(`Validation failed: Generator ID ${generator.id} references a non-existent entity (${generator.generationConfig.entityId}).`);
                issues.push(ValidationMessages.generatorValidation(
                    'entity reference',
                    generator.id,
                    `References non-existent entity ${generator.generationConfig.entityId}`,
                    generator.name
                ));
            }
        }

        const periodicOccurrences = generator.generationConfig.periodicOccurrences ?? Infinity;
        const maxEntities = generator.generationConfig.maxEntities ?? Infinity;
        const entitiesPerCreation = generator.generationConfig.entitiesPerCreation ?? 1;

        if (periodicOccurrences !== Infinity && maxEntities !== Infinity) {
            const totalEntities = periodicOccurrences * entitiesPerCreation;
            if (totalEntities > maxEntities) {
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

    private validateExitConnector(
        generator: Generator,
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates that a Generator has exactly one outgoing connector.
         * - 0 connectors = ERROR (entities have nowhere to go)
         * - 1 connector = OK
         * - >1 connectors = WARNING (generators route to single destination)
         */

        this.log(`Starting exit connector validation for Generator ID: ${generator.id}`);

        const outgoingConnectors = state.modelDefinition.connectors.getAll()
            .filter(c => c.sourceId === generator.id);

        if (outgoingConnectors.length === 0) {
            this.log(`Validation failed: Generator ID ${generator.id} has no exit connector.`);
            issues.push(ValidationMessages.generatorValidation(
                'exit connector',
                generator.id,
                'Generator must have an exit connector to route generated entities',
                generator.name
            ));
        } else if (outgoingConnectors.length > 1) {
            this.log(`Warning: Generator ID ${generator.id} has ${outgoingConnectors.length} exit connectors.`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'generator_multiple_exit_connectors',
                `Generator '${generator.name || generator.id}' has ${outgoingConnectors.length} exit connectors; only the first will be used for routing`,
                generator.id
            ));
        }

        this.log(`Completed exit connector validation for Generator ID: ${generator.id}`);
    }

    private validateGeneratorInteractions(
        generators: Generator[],
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates interactions among multiple Generators.
         * Checks for potential system overload due to high entity generation rates.
         */

        this.log(`Starting generator interactions validation.`);

        // Calculate total entity generation rate (only for constant interval durations)
        let totalEntitiesPerSecond = 0;
        generators.forEach(generator => {
            if (!generator.generationConfig) return;

            const intervalValue = this.getDurationValue(generator.generationConfig.periodIntervalDuration);
            if (intervalValue && intervalValue > 0) {
                const entitiesPerCreation = generator.generationConfig.entitiesPerCreation ?? 1;
                const generatorRate = entitiesPerCreation / intervalValue;
                totalEntitiesPerSecond += generatorRate;
            }
        });

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
