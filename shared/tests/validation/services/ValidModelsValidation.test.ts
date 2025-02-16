// tests/validation/services/ValidModelsValidation.test.ts
import { ModelValidationService } from '../../../src/validation/services/ModelValidationService';
import { ModelDefinition } from '../../../src/types/elements/ModelDefinition';
import { Duration } from '../../../src/types/elements/Duration';
import { PeriodUnit } from '../../../src/types/elements/PeriodUnit';
import { DurationType } from '../../../src/types/elements/DurationType';
import {
    createModel_def_e0_a1_r0_g1,
    createModel_def_e0_a1_r2_g1,
    createModel_def_e0_a2_r0_g1,
    createModel_def_e0_a2_r2_g1,
    createModel_def_e1_a1_r0_g1,
    createModel_def_e1_a1_r2_g1,
    createModel_def_e1_a2_r0_g1,
    createModel_def_e1_a2_r2_g1
} from '../../__fixtures__/models/valid';

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

    console.log('\nResources:', modelDefinition.resources.getAll().map(r => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity
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

describe('Valid Models Validation', () => {
    let validationService: ModelValidationService;

    beforeEach(() => {
        validationService = new ModelValidationService();
    });

    describe('Basic Model Configurations', () => {
        const testCases = [
            {
                name: 'e0_a1_r0_g1',
                createFn: createModel_def_e0_a1_r0_g1,
                expectedCounts: {
                    entities: 1,  // Default entity
                    activities: 1,
                    resources: 0,
                    generators: 1
                }
            },
            {
                name: 'e0_a1_r2_g1',
                createFn: createModel_def_e0_a1_r2_g1,
                expectedCounts: {
                    entities: 1,
                    activities: 1,
                    resources: 2,
                    generators: 1
                }
            },
            {
                name: 'e0_a2_r0_g1',
                createFn: createModel_def_e0_a2_r0_g1,
                expectedCounts: {
                    entities: 1,
                    activities: 2,
                    resources: 0,
                    generators: 1
                }
            },
            {
                name: 'e1_a1_r0_g1',
                createFn: createModel_def_e1_a1_r0_g1,
                expectedCounts: {
                    entities: 2, // Default + 1
                    activities: 1,
                    resources: 0,
                    generators: 1
                }
            },
            {
                name: 'e1_a2_r0_g1',
                createFn: createModel_def_e1_a2_r0_g1,
                expectedCounts: {
                    entities: 2, // Default + 1
                    activities: 2,
                    resources: 0,
                    generators: 1
                }
            },
            {
                name: 'e1_a2_r2_g1',
                createFn: createModel_def_e1_a2_r2_g1,
                expectedCounts: {
                    entities: 2, // Default + 1
                    activities: 2,
                    resources: 2,
                    generators: 1
                }
            }
        ];

        test.each(testCases)(
            'validates $name model configuration',
            ({ name, createFn, expectedCounts }) => {
                const modelDefinition = createFn();

                // Verify model structure
                expect(modelDefinition.entities.size()).toBe(expectedCounts.entities);
                expect(modelDefinition.activities.size()).toBe(expectedCounts.activities);
                expect(modelDefinition.resources.size()).toBe(expectedCounts.resources);
                expect(modelDefinition.generators.size()).toBe(expectedCounts.generators);

                // Run validation
                const result = validationService.validate(modelDefinition);

                // If validation fails, log detailed information
                if (!result.isValid) {
                    console.error(`\nValidation failed for model: ${name}`);
                    logModelDefinition(modelDefinition);
                    console.error('\nValidation Errors:',
                        result.messages.filter(m => m.type === 'error')
                    );
                }

                // Assertions
                expect(result.isValid).toBe(true);
                expect(result.errorCount).toBe(0);
                expect(result.messages.filter(m => m.type === 'error')).toHaveLength(0);
            }
        );
    });

    describe('Complex Model Configurations', () => {
        it('validates model with resources and multi-activity flow', () => {
            const modelDefinition = createModel_def_e0_a2_r2_g1();
            const result = validationService.validate(modelDefinition);

            if (!result.isValid) {
                console.error('\nValidation failed for complex model');
                logModelDefinition(modelDefinition);
                console.error('\nValidation Errors:',
                    result.messages.filter(m => m.type === 'error')
                );
            }

            expect(result.isValid).toBe(true);
            expect(result.errorCount).toBe(0);
        });

        it('validates model with custom entity and resources', () => {
            const modelDefinition = createModel_def_e1_a1_r2_g1();
            const result = validationService.validate(modelDefinition);

            if (!result.isValid) {
                console.error('\nValidation failed for model with custom entity');
                logModelDefinition(modelDefinition);
                console.error('\nValidation Errors:',
                    result.messages.filter(m => m.type === 'error')
                );
            }

            expect(result.isValid).toBe(true);
            expect(result.errorCount).toBe(0);
        });
    });

    describe('Generator Configurations', () => {
        it('validates generator periodic start duration', () => {
            const modelDefinition = createModel_def_e0_a1_r0_g1();
            const generator = modelDefinition.generators.getAll()[0];

            // Verify generator configuration
            expect(generator.periodicStartDuration).toBeDefined();
            expect(generator.periodicStartDuration.durationLength).not.toBeLessThan(0);
            expect(generator.periodicStartDuration.durationPeriodUnit).toBeDefined();
            expect(generator.periodicStartDuration.durationType).toBeDefined();

            const result = validationService.validate(modelDefinition);

            if (!result.isValid) {
                console.error('\nGenerator validation failed');
                console.error('Generator configuration:', {
                    id: generator.id,
                    periodicStartDuration: generator.periodicStartDuration
                });
                console.error('\nValidation Errors:',
                    result.messages.filter(m => m.type === 'error')
                );
            }

            expect(result.isValid).toBe(true);
            expect(result.errorCount).toBe(0);
        });
    });
});