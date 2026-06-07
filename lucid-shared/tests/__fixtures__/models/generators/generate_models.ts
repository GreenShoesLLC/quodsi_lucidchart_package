import { writeFileSync } from 'fs';
import { join } from 'path';
import { createModelDefinition } from './template_generator';

interface ModelConfig {
    entityCount: number;
    activityCount: number;
    resourceCount: number;
    generatorCount: number;
}

const combinations: ModelConfig[] = [];
const counts = {
    entities: [0, 1],           // 2 options
    activities: [1, 2],         // 2 options
    resources: [0, 2],          // 2 options (no resources or 2 resources)
    generators: [1]             // 1 option
};

// Generate base combinations
for (const entityCount of counts.entities) {
    for (const activityCount of counts.activities) {
        for (const resourceCount of counts.resources) {
            for (const generatorCount of counts.generators) {
                combinations.push({
                    entityCount,
                    activityCount,
                    resourceCount,
                    generatorCount
                });
            }
        }
    }
}

// Add specific large model configuration
combinations.push({
    entityCount: 3,
    activityCount: 30,
    resourceCount: 3,
    generatorCount: 2
});

// Create model definition files
combinations.forEach((config, index) => {
    const filename = `model_def_e${config.entityCount}_a${config.activityCount}_r${config.resourceCount}_g${config.generatorCount}.ts`;
    
    const content = `import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { createModelDefinition } from './template_generator';

export function create${filename.replace('.ts', '').replace(/-/g, '_')}(): ModelDefinition {
    return createModelDefinition({
        entityCount: ${config.entityCount},
        activityCount: ${config.activityCount},
        resourceCount: ${config.resourceCount},
        generatorCount: ${config.generatorCount}
    }, ${index + 1});
}
`;

    writeFileSync(join(__dirname, filename), content);
    console.log(`Generated: ${filename}`);
});

// Create index file
const indexContent = `// Auto-generated index file for model definitions
${combinations.map((config) => {
    const filename = `model_def_e${config.entityCount}_a${config.activityCount}_r${config.resourceCount}_g${config.generatorCount}`;
    return `export * from './${filename}';`;
}).join('\n')}
`;

writeFileSync(join(__dirname, 'index.ts'), indexContent);

console.log(`\nGenerated ${combinations.length} model definition files + index.ts`);