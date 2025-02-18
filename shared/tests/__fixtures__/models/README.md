# Model Fixtures Guide

This directory contains test fixtures for model definitions. Each type of fixture serves a different testing purpose.

## Directory Structure
```
models/
├── generators/              # Tools for generating model combinations
│   ├── generate_models.ts    # Script to create model files
│   ├── template_generator.ts # Template for model generation
│   └── *.ts                 # Generated model files
├── valid/                  # Valid model fixtures for serialization tests
│   ├── index.ts             # Exports all valid models
│   ├── sequential_flow.ts   # Custom flow pattern model
│   └── *.ts                # Generated model files
└── invalid/               # Invalid model fixtures
```

## 1. Adding/Updating Generated Models

### Understanding Generator Files

#### `template_generator.ts`
This is the core template that defines how models are created. It:
- Creates resources, requirements, entities, activities, and generators
- Defines relationships between components
- Sets up operation steps and connectors

Key configuration interface:
```typescript
interface ModelConfig {
    entityCount: number;     // Number of custom entities to create
    activityCount: number;   // Number of activities in the model
    resourceCount: number;   // Number of resources to create
    generatorCount: number;  // Number of generators to create
}
```

The template generator will:
1. Create resources and their requirements
2. Create entities beyond the default entity
3. Create activities with operation steps
4. Set up generators and connectors

#### `generate_models.ts`
This script generates model definition files using combinations of components.

Basic setup:
```typescript
const counts = {
    entities: [0, 1],           // Will create models with 0 or 1 entities
    activities: [1, 2],         // Will create models with 1 or 2 activities
    resources: [0, 2],          // Will create models with 0 or 2 resources
    generators: [1]             // All models will have 1 generator
};
```

Adding a specific combination:
```typescript
// After the existing combinations loop
combinations.push({
    entityCount: 3,        // 3 custom entities
    activityCount: 30,     // 30 activities
    resourceCount: 3,      // 3 resources
    generatorCount: 2      // 2 generators
});
```

### Adding a New Generated Model

1. Decide whether to:
   - Add to combinations array for systematic testing:
   ```typescript
   // Edit generate_models.ts
   const counts = {
       entities: [0, 1, 3],     // Added 3 entities option
       activities: [1, 2, 30],  // Added 30 activities option
       ...
   };
   ```
   
   - Or add a specific combination:
   ```typescript
   // Edit generate_models.ts
   combinations.push({
       entityCount: 3,
       activityCount: 30,
       resourceCount: 3,
       generatorCount: 2
   });
   ```

2. Generate the model files:
```bash
cd C:\_source\Greenshoes\quodsi_lucidchart_package\shared
npx ts-node tests/__fixtures__/models/generators/generate_models.ts
```

### Updating Template Generator

If you need to modify how models are generated (e.g., adding new component relationships or changing defaults), edit `template_generator.ts`:

```typescript
export function createModelDefinition(config: ModelConfig, index: number): ModelDefinition {
    // Example: Modify how operation steps are created
    const operationSteps = requirements.length > 0
        ? requirements.map(req => createOperationStep(duration, {
            requirementId: req.id,
            quantity: 1
          }))
        : [createOperationStep(duration)];

    // Example: Change how activities are connected
    for (let i = 0; i < activities.length - 1; i++) {
        const connector = new Connector(
            `connector-${i + 1}`,
            `Activity${i + 1}ToActivity${i + 2}`,
            activities[i].id,
            activities[i + 1].id,
            1.0,  // Changed probability
            ConnectType.Probability
        );
        modelDef.connectors.add(connector);
    }
}
```

## 2. Adding One-Off Valid Models

Use this for creating models that test specific patterns or scenarios (like sequential_flow.ts).

1. Create new file in `valid/` directory:
```typescript
// valid/my_special_flow.ts
import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { Activity } from '../../../../src/types/elements/Activity';
// ... other imports

export function createMySpecialFlowModel(): ModelDefinition {
    const modelDef = new ModelDefinition(/* ... */);
    // Build your specific model
    return modelDef;
}
```

2. Add to `valid/index.ts`:
```typescript
export * from './my_special_flow';
```

## 3. Adding Invalid Models

Use this to test how the system handles invalid model definitions.

1. Create new file in `invalid/` directory:
```typescript
// invalid/missing_entity.ts
import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';

export function createInvalidMissingEntityModel(): ModelDefinition {
    const modelDef = new ModelDefinition(/* ... */);
    // Create intentionally invalid model
    return modelDef;
}
```

2. Reference in your test files as needed.

## Examples

### Generated Model
```typescript
// Combination of components for testing
export function createModel_def_e1_a2_r2_g1(): ModelDefinition {
    return createModelDefinition({
        entityCount: 1,
        activityCount: 2,
        resourceCount: 2,
        generatorCount: 1
    }, 1);
}
```

### Flow Pattern Model
```typescript
// Testing specific flow patterns
export function createSequentialFlowModel(): ModelDefinition {
    const modelDef = new ModelDefinition(/* ... */);
    // Setup sequential flow with three activities in series
    const activity1 = new Activity("activity-1", "Activity 1", 1, 1, 1, [/* operation steps */]);
    const activity2 = new Activity("activity-2", "Activity 2", 1, 1, 1, [/* operation steps */]);
    const activity3 = new Activity("activity-3", "Activity 3", 1, 1, 1, [/* operation steps */]);

    modelDef.activities.add(activity1);
    modelDef.activities.add(activity2);
    modelDef.activities.add(activity3);

    // Connect activities in sequence
    modelDef.connectors.add(new Connector(/* activity1 -> activity2 */));
    modelDef.connectors.add(new Connector(/* activity2 -> activity3 */));

    return modelDef;
}
```

### Invalid Model
```typescript
// Testing error handling - no entities
export function createInvalidModel(): ModelDefinition {
    const modelDef = new ModelDefinition(/* ... */);
    // Intentionally skip adding any entities
    return modelDef;
}
```