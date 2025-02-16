// tests/validation/services/InvalidModelsValidation.test.ts
import { ModelValidationService } from '../../../src/validation/services/ModelValidationService';
// import * as invalidModels from '../../__fixtures__/models/invalid';

import * as invalidModels from '../../__fixtures__/models/invalid';
import { ModelDefinition } from '../../../src/types/elements/ModelDefinition';

function logModelDefinition(modelDefinition: ModelDefinition): void {
    console.log('\nModel Structure:');
    console.log('Model:', {
        id: modelDefinition.id,
        name: modelDefinition.name
    });

    console.log('\nEntities:', modelDefinition.entities.getAll().map(e => ({
        id: e.id,
        name: e.name
    })));

    console.log('\nActivities:', modelDefinition.activities.getAll().map(a => ({
        id: a.id,
        name: a.name,
        operationSteps: a.operationSteps
    })));

    console.log('\nGenerators:', modelDefinition.generators.getAll().map(g => ({
        id: g.id,
        name: g.name,
        entityId: g.entityId,
        maxEntities: g.maxEntities,
        periodicStartDuration: g.periodicStartDuration,
        type: g.type
    })));

    console.log('\nConnectors:', modelDefinition.connectors.getAll().map(c => ({
        id: c.id,
        name: c.name,
        sourceId: c.sourceId,
        targetId: c.targetId,
        probability: c.probability,
        connectType: c.connectType
    })));
}

describe('Invalid Models Validation', () => {
    let validationService: ModelValidationService;

    beforeEach(() => {
        validationService = new ModelValidationService();
    });

    describe('Invalid Model Configurations', () => {
        // Get all model creation functions
        const modelFactories = Object.entries(invalidModels)
            .filter(([key]) => key.startsWith('create'))
            .map(([name, factory]) => ({ name, factory }));

        test.each(modelFactories)(
            '$name should fail validation',
            ({ name, factory }) => {
                const modelDefinition = (factory as () => ModelDefinition)();
                const result = validationService.validate(modelDefinition);

                // If validation unexpectedly passes, log model details
                if (result.isValid) {
                    console.error(`\nModel ${name} unexpectedly passed validation!`);
                    logModelDefinition(modelDefinition);
                    console.error('\nNo validation errors were found when errors were expected.');
                }

                expect(result.isValid).toBe(false);
                expect(result.errorCount).toBeGreaterThan(0);
                expect(result.messages.filter(m => m.type === 'error')).not.toHaveLength(0);

                // Log the validation errors (helpful for debugging)
                console.log(`\nExpected validation errors for ${name}:`,
                    result.messages.filter(m => m.type === 'error')
                );
            }
        );
    });

    // Specific test cases for each invalid model
    describe('No Activity Model', () => {
        it('should fail validation due to missing activities', () => {
            const modelDefinition = invalidModels.createNoActivityModel();
            const result = validationService.validate(modelDefinition);

            expect(result.isValid).toBe(false);
            expect(result.messages.some(m =>
                m.type === 'error' &&
                m.message.includes('activity')
            )).toBe(true);
        });
    });

    describe('No Generator Model', () => {
        it('should fail validation due to missing generators', () => {
            const modelDefinition = invalidModels.createNoGeneratorModel();
            const result = validationService.validate(modelDefinition);

            expect(result.isValid).toBe(false);
            expect(result.messages.some(m =>
                m.type === 'error' &&
                m.message.includes('generator')
            )).toBe(true);
        });
    });
});