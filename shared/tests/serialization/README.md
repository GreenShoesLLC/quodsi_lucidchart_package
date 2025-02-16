# Model Definition Snapshot Testing

This directory contains the snapshot testing framework for model definition serialization. The system supports both individual and bulk testing of model serialization.

## File Structure

```
serialization/
├── __fixtures__/
│   ├── modelDefinitions/     # Model definition files
│   │   ├── template_generator.ts    # Utility for generating model definitions
│   │   ├── model_def_*.ts          # Generated model definitions
│   │   ├── sequential_flow.ts      # Sequential flow example
│   │   ├── non_sequential_flow.ts  # Non-sequential flow example
│   │   └── index.ts
│   └── expectedJson/        # Generated JSON snapshots
│       └── *.json
├── generateFixtures.ts      # Snapshot generator
├── ModelSerializer.snapshot.test.ts  # Test framework
└── README.md               # This file
```

## Workflows

### 1. Adding a New Model Definition

When adding a new model without changing core serialization:

1. Create your new model definition file in `__fixtures__/modelDefinitions/`
2. Generate snapshot for just the new model:
```bash
npm run test:update-single-snapshot -- new_model_name
```
3. Verify the new model's snapshot:
```bash
npm run test:verify-single-snapshot --model=new_model_name
```

### 2. Modifying Core Code

When making changes to model definition or serialization code:

1. First verify if changes affect existing snapshots:
```bash
npm run test:verify-snapshots
```

2. If changes are expected and correct, regenerate all snapshots:
```bash
npm run test:update-snapshots
```

3. Re-verify all snapshots:
```bash
npm run test:verify-snapshots
```

## Available Commands

### Snapshot Generation
- `npm run test:update-snapshots` 
  - Generates/updates ALL model snapshots
  - Use when core serialization logic changes
  
- `npm run test:update-single-snapshot -- model_name`
  - Generates/updates specific model snapshot(s)
  - Example: `npm run test:update-single-snapshot -- non_sequential_flow`
  - Can specify multiple models: `npm run test:update-single-snapshot -- model1 model2`

### Snapshot Testing
- `npm run test:verify-snapshots`
  - Tests ALL model snapshots
  - Use to verify core serialization changes

- `npm run test:verify-single-snapshot --model=model_name`
  - Tests specific model snapshot
  - Example: `npm run test:verify-single-snapshot --model=non_sequential_flow`

## Current Model Definitions

### Generated Models
The following models test various combinations of components:
- `model_def_e0_a1_r0_g1` - No entities, 1 activity, no resources
- `model_def_e0_a1_r2_g1` - No entities, 1 activity, 2 resources
- `model_def_e0_a2_r0_g1` - No entities, 2 activities, no resources
- `model_def_e0_a2_r2_g1` - No entities, 2 activities, 2 resources
- `model_def_e1_a1_r0_g1` - 1 entity, 1 activity, no resources
- `model_def_e1_a1_r2_g1` - 1 entity, 1 activity, 2 resources
- `model_def_e1_a2_r0_g1` - 1 entity, 2 activities, no resources
- `model_def_e1_a2_r2_g1` - 1 entity, 2 activities, 2 resources

### Flow Pattern Models
- `sequential_flow` - Linear flow through three activities
- `non_sequential_flow` - Split flow (50/50) from first activity to two parallel activities

## Naming Conventions
- Generated models: `model_def_e{entity_count}_a{activity_count}_r{resource_count}_g{generator_count}.ts`
- Flow pattern models: Descriptive names like `sequential_flow.ts`

## Using the Template Generator

The `template_generator.ts` provides a configurable way to create model definitions with specific quantities of components:

```typescript
createModelDefinition({
    entityCount: 1,
    activityCount: 2,
    resourceCount: 2,
    generatorCount: 1
}, modelIndex);
```

Use this for creating new test cases with specific component combinations.

## Best Practices

1. Single Model Changes
   - Use single-snapshot commands when adding new models
   - Avoids accidentally modifying existing snapshots

2. Core Code Changes
   - Always verify all snapshots first
   - Review snapshot diffs carefully
   - Update all snapshots only when changes are intended

3. New Model Types
   - Consider adding new test groups in ModelSerializer.snapshot.test.ts
   - Document new patterns in this README

4. Version Control
   - Commit both model definitions and their snapshots
   - Review snapshot diffs during code review
