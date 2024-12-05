import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '../../shared/types/ValidationTypes';
import { ModelState } from './ModelState';
import { Generator } from '../../shared/types/elements/Generator';

export class GeneratorValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        const generators = state.modelDefinition.generators.getAll();

        generators.forEach(generator => {
            this.validateGeneratorConnectivity(generator, state, messages);
            this.validateGeneratorData(generator, state, messages);
        });
    }

    private validateGeneratorConnectivity(
        generator: Generator,
        state: ModelState,
        messages: ValidationMessage[]
    ): void {
        // Check for outgoing connections using the connections map
        const hasOutgoingConnections = Array.from(state.connections.values())
            .some(connection => connection.sourceId === generator.id);

        if (!hasOutgoingConnections) {
            messages.push({
                type: 'error',
                message: `Generator ${generator.id} has no outgoing connections`,
                elementId: generator.id
            });
        }
    }

    private validateGeneratorData(
        generator: Generator,
        state: ModelState,
        messages: ValidationMessage[]
    ): void {
        // Validate basic properties
        if (!generator.name || generator.name.trim().length === 0) {
            messages.push({
                type: 'warning',
                message: `Generator ${generator.id} has no name`,
                elementId: generator.id
            });
        }

        if (typeof generator.entitiesPerCreation !== 'number' || generator.entitiesPerCreation < 1) {
            messages.push({
                type: 'error',
                message: `Generator ${generator.id} has invalid entities per creation count`,
                elementId: generator.id
            });
        }

        // Validate duration settings
        if (!generator.periodIntervalDuration) {
            messages.push({
                type: 'error',
                message: `Generator ${generator.id} has no period interval duration`,
                elementId: generator.id
            });
        }

        if (!generator.periodicStartDuration) {
            messages.push({
                type: 'error',
                message: `Generator ${generator.id} has no periodic start duration`,
                elementId: generator.id
            });
        }

        if (typeof generator.maxEntities !== 'number' || generator.maxEntities < 1) {
            messages.push({
                type: 'warning',
                message: `Generator ${generator.id} has invalid maximum entities limit`,
                elementId: generator.id
            });
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
}