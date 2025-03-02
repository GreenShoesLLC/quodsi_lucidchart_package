# Quodsi Validation System

This directory contains the validation framework for Quodsi simulation models. The validation system ensures that models meet all requirements for successful simulation execution.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Validation Rules](#validation-rules)
- [Usage](#usage)
- [Validation Process](#validation-process)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Adding Custom Rules](#adding-custom-rules)
- [Testing](#testing)

## Overview

The validation system analyzes `ModelDefinition` objects to ensure they:

1. Contain all required elements for simulation
2. Maintain proper relationships between components
3. Have valid configuration values
4. Meet structural requirements for the simulation engine

Validation generates detailed messages indicating problems and provides guidance on how to fix issues.

## System Architecture

The validation system follows a modular architecture with these components:

```
validation/
├── common/              # Common utilities and base classes
│   ├── ValidationMessages.ts   # Standard message creation
│   └── ValidationRule.ts       # Base rule class
├── models/              # Data models for validation
│   └── ModelDefinitionState.ts # Validation context and caching
├── rules/               # Individual validation rules
│   ├── ActivityValidation.ts     # Activity-specific rules
│   ├── ConnectorValidation.ts    # Connector relationship rules
│   ├── ElementCountsValidation.ts # Element count rules
│   ├── EntityValidation.ts       # Entity-specific rules
│   ├── GeneratorValidation.ts    # Generator-specific rules
│   └── ResourceValidation.ts     # Resource-specific rules
└── services/            # Validation orchestration
    └── ModelValidationService.ts # Main validation service
```

### Core Components

- **ModelValidationService**: Primary service that orchestrates validation
- **ValidationRule**: Base class for all validation rules
- **ModelDefinitionState**: Preprocessing and caching of model state
- **ValidationMessages**: Standardized message creation

## Validation Rules

The system includes the following validation rules:

### 1. Element Counts Validation

Ensures the model has the minimum required elements:
- At least one activity
- At least one generator
- At least one entity

### 2. Activity Validation

Validates activity configuration:
- Connected to generators or other activities
- Proper configuration of operation steps
- Valid resource requirements
- Buffer capacity validation

### 3. Connector Validation

Validates connections between elements:
- Valid source and target elements
- No circular references
- Valid probability configurations
- Appropriate connection types

### 4. Generator Validation

Validates generator configuration:
- Valid entity assignment
- Proper timing configuration
- Valid connections to activities
- Proper entity creation settings

### 5. Resource Validation

Validates resource configuration:
- Valid capacity settings
- Proper resource requirement structure
- Valid resource allocation configurations

### 6. Entity Validation

Validates entity configuration:
- Proper configuration
- Used by at least one generator
- Valid relationships

## Usage

Basic usage example:

```typescript
import { ModelValidationService } from 'shared/src/validation/services/ModelValidationService';

// Create validation service
const validationService = new ModelValidationService();

// Validate model
const validationResult = validationService.validate(modelDefinition);

// Check validation status
if (validationResult.isValid) {
    console.log('Model is valid');
} else {
    console.log(`Model has ${validationResult.errorCount} errors and ${validationResult.warningCount} warnings`);
    validationResult.messages.forEach(msg => {
        console.log(`${msg.type}: ${msg.message}`);
    });
}
```

## Validation Process

The validation process follows these steps:

1. **Preprocessing**: Build relationship maps and cache state
2. **Rule Application**: Execute all validation rules
3. **Message Collection**: Gather all validation messages
4. **Result Calculation**: Determine overall validation status
5. **Reporting**: Create a structured validation result

### Validation Results

Validation produces a `ValidationResult` object with:
- `isValid`: Boolean indicating overall validity
- `errorCount`: Number of error messages
- `warningCount`: Number of warning messages
- `messages`: Array of validation messages

### Message Types

Messages can be of the following types:
- `error`: Critical issues that must be fixed
- `warning`: Non-critical issues that should be addressed
- `info`: Informational messages
- `success`: Positive validation results

## Error Handling

The validation system includes robust error handling:

1. **Validation Failures**: Structured as ValidationMessages
2. **Runtime Errors**: Caught and converted to ValidationMessages
3. **Context Information**: Errors include reference to the related component
4. **Recovery**: System continues validation even after errors

## Performance Optimization

The validation system includes several optimizations:

1. **State Caching**: ModelDefinitionState caches relationship information
2. **Hash-Based Caching**: Reuses validation results for unchanged models
3. **Relationship Preprocessing**: Builds activity relationships once for multiple rules
4. **Batch Validation**: Processes rules efficiently

## Adding Custom Rules

To add a new validation rule:

1. Create a new rule class extending `ValidationRule`
2. Implement the `validate` method
3. Register the rule in `ModelValidationService`

Example:

```typescript
import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from '../models/ModelDefinitionState';
import { ValidationMessage } from '../../types/validation';
import { ValidationMessages } from '../common/ValidationMessages';

export class CustomValidationRule extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        // Implement validation logic
        const { modelDefinition } = state;
        
        // Check your validation conditions
        if (someConditionFails) {
            messages.push(ValidationMessages.error(
                'custom_rule_error',
                'Description of the error',
                'Suggestion to fix the issue'
            ));
        }
    }
}

// Add to ModelValidationService
constructor() {
    super();
    this.rules = [
        // Existing rules...
        new CustomValidationRule()
    ];
}
```

## Testing

The validation system includes comprehensive test coverage:

### Test Structure

Tests are located in `shared/tests/validation/` and include:

1. **Valid Model Tests**: Tests using valid model configurations
2. **Invalid Model Tests**: Tests using intentionally invalid models
3. **Rule-Specific Tests**: Tests focusing on individual validation rules
4. **Helper Functions**: Utilities for test model creation

### Test Categories

The test suite covers:

- **Unit Tests**: Testing individual validation rules
- **Integration Tests**: Testing the complete validation system
- **Edge Cases**: Testing boundary conditions
- **Performance Tests**: Testing validation optimization

### Running Tests

Tests can be run using the standard test runner:

```bash
npm test -- --testPathPattern=validation
```

To run specific test files:

```bash
npm test -- shared/tests/validation/services/ValidModelsValidation.test.ts
```

### Test Fixtures

Test fixtures include:

- **Valid Models**: Complete, valid model configurations
- **Invalid Models**: Models with specific validation issues
- **Partial Models**: Incomplete models for specific tests

### Test Examples

Examples of validation tests:

```typescript
// Testing valid models
test('Valid sequential flow model passes validation', () => {
    const model = createSequentialFlowModel();
    const result = validationService.validate(model);
    expect(result.isValid).toBe(true);
});

// Testing invalid models
test('Model without activities fails validation', () => {
    const model = createModelWithoutActivities();
    const result = validationService.validate(model);
    expect(result.isValid).toBe(false);
    expect(result.messages.some(m => 
        m.code === 'missing_activities'
    )).toBe(true);
});
```

## Conclusion

The Quodsi validation system provides a robust framework for ensuring model correctness before simulation execution. By following a modular design with clear separation of concerns, the system is both maintainable and extensible.
