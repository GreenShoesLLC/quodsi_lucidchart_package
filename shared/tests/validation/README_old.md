# Model Definition Validation Testing

This directory contains the testing framework for model definition validation. The system supports testing both valid and invalid model configurations to ensure proper validation rules are enforced.

## File Structure

```
validation/
├── services/
│   ├── ModelValidationService.test.ts
│   ├── ValidModelsValidation.test.ts
│   └── InvalidModelsValidation.test.ts
├── rules/
│   ├── ActivityValidation.test.ts
│   ├── ConnectorValidation.test.ts
│   ├── ElementCountsValidation.test.ts
│   ├── EntityValidation.test.ts
│   ├── GeneratorValidation.test.ts
│   └── ResourceValidation.test.ts
├── common/
│   ├── ValidationMessages.test.ts
│   └── ValidationRule.test.ts
└── README.md               # This file

Related fixtures:
__fixtures__/models/
├── valid/                 # Valid model definitions
│   ├── sequential_flow.ts
│   ├── non_sequential_flow.ts
│   └── model_def_*.ts
└── invalid/              # Invalid model definitions
    ├── no_activity_model.ts
    ├── no_generator_model.ts
    └── other invalid scenarios...
```

## Test Categories

### 1. Valid Model Testing (ValidModelsValidation.test.ts)
- Tests models that should pass all validation rules
- Verifies correct structure and relationships
- Ensures no false positives in validation

### 2. Invalid Model Testing (InvalidModelsValidation.test.ts)
- Tests models that should fail validation
- Verifies appropriate error messages
- Ensures validation catches all specified issues

### 3. Individual Rule Testing
- Specific tests for each validation rule
- Tests edge cases and boundary conditions
- Verifies rule-specific error messages

## Validation Rules

### Core Rules
1. Model Structure Rules
   - At least one activity
   - At least one generator
   - Valid entity assignments

2. Activity Rules
   - Connected to generator or other activities
   - Valid resource assignments
   - Valid operation steps

3. Generator Rules
   - Valid entity assignment
   - Valid periodic start duration
   - Valid connection to activity

4. Connector Rules
   - Valid source and target elements
   - No circular dependencies
   - Valid probability assignments

5. Resource Rules
   - Valid capacity values
   - Valid resource requirements

## Available Test Commands

### Running All Validation Tests
```bash
npm test -- tests/validation/**/*.test.ts
```

### Running Specific Test Files
```bash
# Valid models
npm test -- tests/validation/services/ValidModelsValidation.test.ts

# Invalid models
npm test -- tests/validation/services/InvalidModelsValidation.test.ts

# Specific rule
npm test -- tests/validation/rules/ActivityValidation.test.ts
```

## Current Test Models

### Valid Models
- Basic configurations (various combinations of entities, activities, resources)
- Flow patterns (sequential, non-sequential)
- Resource configurations
- Entity variations

### Invalid Models
- Missing required elements (activities, generators)
- Invalid connections
- Invalid resource assignments
- Invalid entity configurations

## Best Practices

1. Creating Test Models
   - Follow established naming conventions
   - Document expected validation behavior
   - Include edge cases and boundary conditions

2. Writing Validation Tests
   - Test both positive and negative cases
   - Verify specific error messages
   - Include detailed failure output

3. Rule Testing
   - Test each rule independently
   - Include edge cases
   - Verify rule interactions

4. Error Messages
   - Verify correct error codes
   - Check error message clarity
   - Ensure proper element references

5. Test Organization
   - Group related test cases
   - Use descriptive test names
   - Include adequate documentation

## Invalid Model Patterns

When creating invalid model cases:

1. Basic Invalidity
   - Missing required components
   - Invalid component counts
   - Structural issues

2. Connection Issues
   - Disconnected activities
   - Invalid source/target
   - Circular dependencies

3. Resource Issues
   - Invalid assignments
   - Missing requirements
   - Capacity problems

4. Entity Issues
   - Invalid assignments
   - Missing references
   - Incorrect configurations

## Contributing

When adding new validation tests:

1. Add the test case in appropriate test file
2. Create necessary model fixtures
3. Document expected behavior
4. Verify both positive and negative cases
5. Update this README if adding new patterns