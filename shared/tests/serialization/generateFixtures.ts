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
    createModel_def_e1_a2_r2_g1
} from '../__fixtures__/models/valid';
import { createNonSequentialFlowModel } from '../__fixtures__/models/valid/non_sequential_flow';

// Define all model creators with their corresponding filenames
const MODEL_CREATORS = [
    { create: createModel_def_e0_a1_r0_g1, name: 'model_def_e0_a1_r0_g1' },
    { create: createModel_def_e0_a1_r2_g1, name: 'model_def_e0_a1_r2_g1' },
    { create: createModel_def_e0_a2_r0_g1, name: 'model_def_e0_a2_r0_g1' },
    { create: createModel_def_e0_a2_r2_g1, name: 'model_def_e0_a2_r2_g1' },
    { create: createModel_def_e1_a1_r0_g1, name: 'model_def_e1_a1_r0_g1' },
    { create: createModel_def_e1_a1_r2_g1, name: 'model_def_e1_a1_r2_g1' },
    { create: createModel_def_e1_a2_r0_g1, name: 'model_def_e1_a2_r0_g1' },
    { create: createModel_def_e1_a2_r2_g1, name: 'model_def_e1_a2_r2_g1' },
    { create: createNonSequentialFlowModel, name: 'non_sequential_flow' }
];

async function generateFixtureJson(modelNames?: string[]) {
    // Define paths
    const fixturesPath = path.join(__dirname, '__fixtures__');
    const expectedJsonPath = path.join(fixturesPath, 'expectedJson');

    // Create directories if they don't exist
    if (!fs.existsSync(expectedJsonPath)) {
        fs.mkdirSync(expectedJsonPath, { recursive: true });
    }

    // Filter model creators if specific models are requested
    const modelsToGenerate = modelNames 
        ? MODEL_CREATORS.filter(m => modelNames.includes(m.name))
        : MODEL_CREATORS;

    if (modelNames && modelsToGenerate.length !== modelNames.length) {
        const notFound = modelNames.filter(
            name => !MODEL_CREATORS.some(m => m.name === name)
        );
        console.warn(`Warning: Some requested models were not found: ${notFound.join(', ')}`);
    }

    // Generate each model fixture
    for (const { create, name } of modelsToGenerate) {
        const model = create();
        const serializer = ModelSerializerFactory.create(model);
        const serialized = serializer.serialize(model);

        const outputPath = path.join(expectedJsonPath, `${name}.json`);
        
        // Pretty print JSON for better readability
        fs.writeFileSync(outputPath, JSON.stringify(serialized, null, 2));
        
        console.log(`Generated fixture: ${outputPath}`);
    }

    const totalGenerated = modelsToGenerate.length;
    console.log(`\nGenerated ${totalGenerated} fixture${totalGenerated !== 1 ? 's' : ''}`);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
    generateFixtureJson(args);
} else {
    generateFixtureJson();
}
