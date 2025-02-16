# Model Definition Snapshot Testing

This directory contains the snapshot testing framework for model definition serialization. The system allows for testing both individual model definitions and bulk testing of all models.

## File Structure

```
serialization/
├── __fixtures__/
│   ├── modelDefinitions/     # Model definition files
│   │   ├── template_generator.ts
│   │   ├── model_def_*.ts   # Individual model definitions
│   │   └── index.ts
│   └── expectedJson/        # Generated JSON snapshots
│       └── model_def_*.json
├── generateFixtures.ts      # Snapshot generator
├── ModelSerializer.snapshot.test.ts  # Test framework
└── README.md               # This file
```

## Usage

### Adding a New Model Definition

1. Create your new model definition file in `__fixtures__/modelDefinitions/`
2. Generate snapshot for just the new model:
```bash
npm run test:update-single-snapshot -- new_model_name
```
3. Verify the new model's snapshot:
```bash
npm run test:verify-single-snapshot -- new_model_name
```

### Modifying Core Code

When making changes to model definition or serialization code:

1. First verify if changes affect existing snapshots:
```bash
npm run test:verify-snapshots
```

2. If changes are expected, regenerate all snapshots:
```bash
npm run test:update-snapshots
```

3. Verify all snapshots again:
```bash
npm run test:verify-snapshots
```

### Available Commands

- `npm run test:update-snapshots` - Generate/update all snapshots
- `npm run test:update-single-snapshot -- model_name` - Generate/update specific snapshot
- `npm run test:verify-snapshots` - Test all snapshots
- `npm run test:verify-single-snapshot -- model_name` - Test specific snapshot

Multiple models can be specified by separating them with spaces:
```bash
npm run test:update-single-snapshot -- model_1 model_2
```

## Current Model Definitions

### Basic Models
- `model_def_e0_a1_r0_g1` - No entities, 1 activity, no resources
- `model_def_e0_a1_r2_g1` - No entities, 1 activity, 2 resources
- `model_def_e0_a2_r0_g1` - No entities, 2 activities, no resources
- `model_def_e0_a2_r2_g1` - No entities, 2 activities, 2 resources
- `model_def_e1_a1_r0_g1` - 1 entity, 1 activity, no resources
- `model_def_e1_a1_r2_g1` - 1 entity, 1 activity, 2 resources
- `model_def_e1_a2_r0_g1` - 1 entity, 2 activities, no resources
- `model_def_e1_a2_r2_g1` - 1 entity, 2 activities, 2 resources

### Naming Convention
Model definition files follow the pattern:
`model_def_e{entity_count}_a{activity_count}_r{resource_count}_g{generator_count}.ts`

## Template Generator

The `template_generator.ts` provides a standardized way to create model definitions with specific quantities of components. When creating new model definitions, consider using this template to maintain consistency.