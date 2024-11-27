
// GeneratorValidation.ts
import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '../../../shared/types/ValidationTypes';
import { ModelState } from '../interfaces/ModelState';

export class GeneratorValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        for (const generatorId of state.relationships.generators) {
            const generator = state.elements.get(generatorId);
            if (!generator) {
                messages.push({
                    type: 'error',
                    message: `Generator ${generatorId} exists in relationships but not in elements`,
                    elementId: generatorId
                });
                continue;
            }

            // Check for outgoing connections
            let hasOutgoing = false;
            for (const connection of state.connections.values()) {
                if (connection.sourceId === generatorId) {
                    hasOutgoing = true;
                    break;
                }
            }

            if (!hasOutgoing) {
                messages.push({
                    type: 'error',
                    message: `Generator ${generatorId} has no outgoing connections`,
                    elementId: generatorId
                });
            }

            this.validateGeneratorData(generator, messages);
        }
    }

    private validateGeneratorData(generator: any, messages: ValidationMessage[]): void {
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
    }
}