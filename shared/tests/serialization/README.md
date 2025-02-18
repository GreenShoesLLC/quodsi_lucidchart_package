# Model Serialization Testing Guide

This directory handles testing the serialization of model definitions into JSON format. The tests ensure that models are correctly converted to JSON for use in the simulation engine.

## Purpose

The serialization tests verify that:
- Model definitions are correctly converted to JSON
- All required model properties are included
- Relationships between components (activities, resources, etc.) are maintained
- The JSON format matches the expected schema

## Directory Structure
```
serialization/
├── __fixtures__/
│   └── expectedJson/        # JSON snapshots of correctly serialized models
│       └── *.json          # One JSON file per model definition
├── generateFixtures.ts      # Script to create/update JSON snapshots
└── ModelSerializer.snapshot.test.ts  # Test framework that compares current serialization with snapshots
```

## Expected JSON Snapshots

The `expectedJson/` directory contains snapshot files that represent the correct JSON serialization of each model. These serve as the "source of truth" for the tests.

Example snapshot structure:
```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "..."
  },
  "model": {
    "id": "model-1",
    "name": "Model E1A2R2G1",
    ...
  },
  "entities": [...],
  "activities": [...],
  "resources": [...],
  "resourceRequirements": [...],
  "connectors": [...]
}
```

## When to Update Expected JSON

Update snapshots when:
1. You've added new model definitions that need to be tested
2. You've intentionally changed how models are serialized
3. You've modified the serialization schema

Do NOT update when:
1. Tests are failing unexpectedly (investigate the cause first)
2. You haven't made changes to models or serialization logic

## Running Tests

### 1. Verify Current Serialization
```bash
cd C:\_source\Greenshoes\quodsi_lucidchart_package\shared
npm run test:verify-snapshots
```
This compares the current serialization output against the expected JSON snapshots.

### 2. Update Single Model Snapshot
Use this when you've:
- Added a new model definition
- Modified a specific model
- Changed serialization that only affects one model

```bash
# Navigate to shared package
cd C:\_source\Greenshoes\quodsi_lucidchart_package\shared

# Update specific model snapshot
npm run test:update-single-snapshot -- model_def_e1_a2_r2_g1

# You can update multiple specific models
npm run test:update-single-snapshot -- model_def_e1_a2_r2_g1 model_def_e0_a1_r0_g1

# Verify your changes
npm run test:verify-single-snapshot --model=model_def_e1_a2_r2_g1
```

The snapshot update will:
1. Load the specified model definition
2. Serialize it using current logic
3. Save the result as a new JSON snapshot
4. Overwrite the existing snapshot if one exists

### 3. Update All Snapshots
Use this when you've:
- Modified the base serialization logic
- Updated the ModelDefinition interface
- Changed how resource requirements are handled
- Made any change that affects all models

```bash
# Navigate to shared package
cd C:\_source\Greenshoes\quodsi_lucidchart_package\shared

# Update all snapshots
npm run test:update-snapshots

# Always verify after updating
npm run test:verify-snapshots
```

This will:
1. Load all model definitions from valid/
2. Serialize each one using current logic
3. Save each result as a new JSON snapshot
4. Overwrite all existing snapshots

WARNING: This updates ALL snapshots. Make sure you:
- Have committed your current changes
- Can review the snapshot diffs
- Understand why each snapshot changed

## Common Test Scenarios

### 1. Adding New Model Definition
```bash
# 1. Create new model (see models/README.md)
# 2. Generate its snapshot
npm run test:update-single-snapshot -- new_model_name
# 3. Verify the snapshot
npm run test:verify-single-snapshot --model=new_model_name
```

### 2. Modifying Serialization Logic
```bash
# 1. Make changes to serialization code
# 2. Verify if changes affect existing snapshots
npm run test:verify-snapshots
# 3. If changes are intentional, update snapshots
npm run test:update-snapshots
```

### 3. Testing Invalid Models
```bash
# Create tests in ModelSerializer.snapshot.test.ts
describe('Invalid Model Serialization', () => {
  it('should throw error for missing entities', () => {
    const invalidModel = createInvalidMissingEntityModel();
    expect(() => {
      serializer.serialize(invalidModel);
    }).toThrow('At least one entity is required');
  });
});
```

## Test Implementation Details

### How Snapshots Work
1. `generateFixtures.ts`:
   - Takes each model definition
   - Serializes it using current logic
   - Saves result as JSON snapshot

2. `ModelSerializer.snapshot.test.ts`:
   - Loads model definitions
   - Serializes them using current logic
   - Compares with stored snapshots
   - Reports any differences

### Example Test Output
```bash
# Passing test
✓ Model E1A2R2G1 serializes correctly

# Failing test (snapshot mismatch)
✕ Model E1A2R2G1 serializes correctly
  Expected: "resourceRequirements" array to contain 2 items
  Received: Array contains 1 item
```

## Best Practices

1. Snapshot Management
   - Keep snapshots in version control
   - Review snapshot diffs in PRs
   - Update snapshots intentionally, not to fix test failures

2. Test Development
   - Add tests for new serialization features
   - Include error cases and edge cases
   - Document snapshot update reasons

3. Common Issues
   - Snapshot mismatches due to timestamp changes
   - Missing model exports in valid/index.ts
   - Incorrect file paths in test configuration