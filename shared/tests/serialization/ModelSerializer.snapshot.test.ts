import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import * as fs from 'fs';
import * as path from 'path';

// Import all model definitions

import {
    createModel_def_e0_a1_r0_g1,
    createModel_def_e0_a1_r2_g1,
    createModel_def_e0_a2_r0_g1,
    createModel_def_e0_a2_r2_g1,
    createModel_def_e1_a1_r0_g1,
    createModel_def_e1_a1_r2_g1,
    createModel_def_e1_a2_r0_g1,
    createModel_def_e1_a2_r2_g1,
} from '../__fixtures__/models/valid';
import { createNonSequentialFlowModel } from '../__fixtures__/models/valid/non_sequential_flow';


// Define all test cases
const TEST_CASES = [
    { name: 'model_def_e0_a1_r0_g1', create: createModel_def_e0_a1_r0_g1 },
    { name: 'model_def_e0_a1_r2_g1', create: createModel_def_e0_a1_r2_g1 },
    { name: 'model_def_e0_a2_r0_g1', create: createModel_def_e0_a2_r0_g1 },
    { name: 'model_def_e0_a2_r2_g1', create: createModel_def_e0_a2_r2_g1 },
    { name: 'model_def_e1_a1_r0_g1', create: createModel_def_e1_a1_r0_g1 },
    { name: 'model_def_e1_a1_r2_g1', create: createModel_def_e1_a1_r2_g1 },
    { name: 'model_def_e1_a2_r0_g1', create: createModel_def_e1_a2_r0_g1 },
    { name: 'model_def_e1_a2_r2_g1', create: createModel_def_e1_a2_r2_g1 },
    { name: 'non_sequential_flow', create: createNonSequentialFlowModel }
];

// Helper function to normalize values for comparison
function normalizeForComparison(obj: any): any {
    if (obj === null || obj === Infinity) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(normalizeForComparison);
    }
    
    if (typeof obj === 'object') {
        const normalized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip certain dynamic fields
            if (key === 'timestamp') continue;
            if (key === 'parentClauseId') continue;
            
            normalized[key] = normalizeForComparison(value);
        }
        return normalized;
    }
    
    return obj;
}

function testFixture(name: string, createModel: () => any) {
    it(`should match ${name} snapshot`, () => {
        const model = createModel();
        const serializer = ModelSerializerFactory.create(model);
        const serialized = serializer.serialize(model);
        
        const expectedJsonPath = path.join(
            __dirname,
            '__fixtures__/expectedJson',
            `${name}.json`
        );

        // Ensure expected JSON exists
        if (!fs.existsSync(expectedJsonPath)) {
            throw new Error(
                `Expected JSON file not found: ${expectedJsonPath}. ` +
                'Run "npm run test:update-snapshots" to generate it.'
            );
        }

        const expectedJson = JSON.parse(
            fs.readFileSync(expectedJsonPath, 'utf8')
        );

        // Compare normalized versions
        const normalizedExpected = normalizeForComparison(expectedJson);
        const normalizedActual = normalizeForComparison(serialized);

        expect(normalizedActual).toEqual(normalizedExpected);
    });
}

describe('ModelSerializer Snapshots', () => {
    // Get specific models to test from environment variable
    const specificModels = process.env.TEST_MODELS ? process.env.TEST_MODELS.split(',') : null;
    
    if (specificModels) {
        describe('Specific Models', () => {
            specificModels.forEach(modelName => {
                const testCase = TEST_CASES.find(tc => tc.name === modelName);
                if (testCase) {
                    testFixture(testCase.name, testCase.create);
                } else {
                    it(`should find model ${modelName}`, () => {
                        throw new Error(`Model ${modelName} not found in test cases`);
                    });
                }
            });
        });
    } else {
        // Run all tests in groups
        describe('Entity Count Variations', () => {
            testFixture('model_def_e0_a1_r0_g1', createModel_def_e0_a1_r0_g1);
            testFixture('model_def_e1_a1_r0_g1', createModel_def_e1_a1_r0_g1);
        });

        describe('Activity Count Variations', () => {
            testFixture('model_def_e0_a1_r0_g1', createModel_def_e0_a1_r0_g1);
            testFixture('model_def_e0_a2_r0_g1', createModel_def_e0_a2_r0_g1);
        });

        describe('Resource Count Variations', () => {
            testFixture('model_def_e0_a1_r0_g1', createModel_def_e0_a1_r0_g1);
            testFixture('model_def_e0_a1_r2_g1', createModel_def_e0_a1_r2_g1);
        });

        describe('Flow Variations', () => {
            testFixture('non_sequential_flow', createNonSequentialFlowModel);
        });

        describe('All Models', () => {
            TEST_CASES.forEach(({ name, create }) => {
                testFixture(name, create);
            });
        });
    }
});