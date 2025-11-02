# Quodsi Validation System

This document describes the validation framework for Quodsi simulation models. The validation system ensures that models meet all requirements for successful simulation execution.

**Location:** `shared/src/validation/`

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
5. Have complete entity flow paths (no dead-ends)

Validation generates detailed messages indicating problems and provides guidance on how to fix issues.

## System Architecture

The validation system follows a modular architecture with these components:

```
shared/src/validation/
├── common/              # Common utilities and base classes
│   ├── ValidationMessages.ts   # Standard message creation
│   └── ValidationRule.ts       # Base rule class
├── models/              # Data models for validation
│   └── ModelDefinitionState.ts # Validation context and caching
├── rules/               # Individual validation rules
│   ├── ActivityValidation.ts        # Activity-specific rules
│   ├── ConnectorValidation.ts       # Connector relationship rules
│   ├── ElementCountsValidation.ts   # Element count rules
│   ├── EntityValidation.ts          # Entity-specific rules
│   ├── GeneratorValidation.ts       # Generator-specific rules
│   ├── GeneratorPathValidation.ts   # Generator path reachability
│   └── ResourceValidation.ts        # Resource-specific rules
└── services/            # Validation orchestration
    └── ModelValidationService.ts # Main validation service
```

### Core Components

- **ModelValidationService**: Primary service that orchestrates validation
- **ValidationRule**: Base class for all validation rules
- **ModelDefinitionState**: Preprocessing and caching of model state
- **ValidationMessages**: Standardized message creation

## Validation Rules

The system includes the following validation rules (7 total):

### 1. Element Counts Validation

Ensures the model has the minimum required elements:
- At least one activity
- At least one generator
- At least one entity

**Severity**: ERROR (blocks simulation)

### 2. Activity Validation

Validates activity configuration:
- Connected to generators or other activities
- Proper configuration of operation steps
- Valid resource requirements
- Buffer capacity validation
- Cycle time analysis
- Buffer overflow risk detection

**Severity**: ERROR for critical issues, WARNING for optimization suggestions

### 3. Connector Validation

Validates connections between elements:
- Valid source and target elements
- No circular references (WARNING if detected)
- Valid weight configurations (routing probability)
- Appropriate connection types

**Severity**: ERROR for invalid connections, WARNING for circular references

### 4. Generator Validation

Validates generator configuration:
- Valid entity assignment
- Proper timing configuration
- Valid connections to activities
- Proper entity creation settings
- Entity generation rate validation

**Severity**: ERROR for configuration issues, WARNING for rate concerns

### 5. Generator Path Validation

**NEW** - Validates entity flow paths:
- All paths from each Generator must eventually reach a terminal Activity (activity with no outgoing connectors)
- Detects dead-end paths where entities get stuck
- Uses Breadth-First Search (BFS) to explore all reachable activities
- Handles loops correctly (loops are allowed if an exit path exists)

**Error Conditions:**
- Generator has no outgoing connectors
- No path exists to any terminal Activity
- Paths lead to non-terminal Activities with no valid exit

**Severity**: ERROR (blocks simulation)

**Example Error Messages:**
```
ERROR: Generator 'EntityGenerator' has no outgoing connectors. Entities cannot flow into the system.

ERROR: Generator 'EntityGenerator' has no path to a terminal Activity. All paths lead to dead-ends or loops without exits.

ERROR: Generator 'EntityGenerator' has paths that lead to non-terminal Activities with no exit: 'ProcessStep', 'QualityCheck'. Entities may get stuck.
```

### 6. Resource Validation

Validates resource configuration:
- Valid capacity settings (must be >= 1, whole number, reasonable max)
- Proper resource requirement structure
- Valid resource allocation configurations
- Resource usage validation (no unused resources)
- Potential overutilization warnings

**Severity**: ERROR for capacity/configuration issues, WARNING for usage concerns

### 7. Entity Validation

Validates entity configuration:
- Proper configuration
- Used by at least one generator
- Valid relationships

**Severity**: ERROR for configuration issues, WARNING if unused

## Usage

Basic usage example:

```typescript
import { ModelValidationService } from '@quodsi/shared';

// Create validation service
const validationService = new ModelValidationService();

// Validate model
const validationResult = validationService.validate(modelDefinition);

// Check validation status
if (validationResult.isValid) {
    console.log('Model is valid');
} else {
    console.log(`Model has ${validationResult.summary.errorCount} errors and ${validationResult.summary.warningCount} warnings`);
    validationResult.issues.forEach(issue => {
        console.log(`${issue.severity}: ${issue.message}`);
    });
}
```

## Validation Process

The validation process follows these steps:

1. **Preprocessing**: Build relationship maps and cache state
2. **Rule Application**: Execute all validation rules in order
3. **Message Collection**: Gather all validation issues
4. **Result Calculation**: Determine overall validation status
5. **Reporting**: Create a structured validation result

### Validation Results

Validation produces a `ValidationResult` object with:
- `isValid`: Boolean indicating overall validity (no errors)
- `issues`: Array of ValidationIssue objects containing all validation findings
- `summary`: Object with counts of errors, warnings, and info messages
  - `errorCount`: Number of error issues
  - `warningCount`: Number of warning issues
  - `infoCount`: Number of informational issues

### ValidationIssue Structure

Each issue contains:
```typescript
{
    id: string;           // Auto-generated unique ID
    severity: ValidationSeverity;  // ERROR | WARNING | INFO
    code: string;         // Machine-readable code (e.g., 'generator_no_terminal_path')
    message: string;      // Human-readable message
    elementId?: string;   // Optional: ID of the element with the issue
    context?: Record<string, unknown>;  // Optional: Additional metadata
}
```

### Issue Severity Levels

Each ValidationIssue has a severity level (ValidationSeverity enum):
- `ERROR`: Critical issues that must be fixed before simulation (blocks simulation)
- `WARNING`: Non-critical issues that should be addressed (allows simulation)
- `INFO`: Informational messages about the model

## Error Handling

The validation system includes robust error handling:

1. **Validation Failures**: Structured as ValidationIssue objects
2. **Runtime Errors**: Caught and converted to ValidationIssue objects
3. **Context Information**: Issues include element ID and code for categorization
4. **Recovery**: System continues validation even after errors in individual rules

## Performance Optimization

The validation system includes several optimizations:

1. **State Caching**: ModelDefinitionState caches relationship information
2. **Hash-Based Caching**: Reuses validation results for unchanged models
3. **Relationship Preprocessing**: Builds activity relationships once for multiple rules
4. **Batch Validation**: Processes all rules efficiently in a single pass
5. **BFS for Path Analysis**: Efficient graph traversal for Generator path validation

## Adding Custom Rules

To add a new validation rule:

1. Create a new rule class extending `ValidationRule`
2. Implement the `validate` method
3. Register the rule in `ModelValidationService` constructor

Example:

```typescript
import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from '../models/ModelDefinitionState';
import { ValidationIssue, ValidationSeverity } from '@quodsi/shared';
import { ValidationMessages } from '../common/ValidationMessages';

export class CustomValidationRule extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        // Implement validation logic
        const { modelDefinition } = state;

        // Use this.log() for debugging (disabled by default)
        this.log('Starting custom validation');

        // Check your validation conditions
        if (someConditionFails) {
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'custom_rule_error',
                'Description of the error',
                elementId  // Optional: ID of the element with the issue
            ));
        }
    }
}

// Add to ModelValidationService constructor
constructor() {
    super();
    this.rules = [
        new ElementCountsValidation(),
        new ActivityValidation(),
        new ConnectorValidation(),
        new GeneratorValidation(),
        new GeneratorPathValidation(),
        new ResourceValidation(),
        new EntityValidation(),
        new CustomValidationRule()  // Add your rule here
    ];
    this.setLogging(false);
}
```

## Testing

The validation system includes comprehensive test coverage.

### Test Structure

Tests are located in `shared/tests/validation/services/` and include:

1. **ValidModelsValidation.test.ts**: Tests using valid model configurations
2. **InvalidModelsValidation.test.ts**: Tests using intentionally invalid models

### Test Categories

The test suite covers:

- **Unit Tests**: Testing individual validation rules
- **Integration Tests**: Testing the complete validation system
- **Edge Cases**: Testing boundary conditions
- **Performance Tests**: Testing validation optimization

### Running Tests

Tests can be run using the standard test runner:

```bash
# Run all validation tests
npm test -- --testPathPattern=validation

# Run specific test file
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
    expect(result.issues.some(issue =>
        issue.code === 'missing_required_element'
    )).toBe(true);
});

// Testing Generator path validation
test('Generator with no path to terminal fails validation', () => {
    const model = createGeneratorWithDeadEndPath();
    const result = validationService.validate(model);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(issue =>
        issue.code === 'generator_no_terminal_path'
    )).toBe(true);
});
```

## Conclusion

The Quodsi validation system provides a robust framework for ensuring model correctness before simulation execution. By following a modular design with clear separation of concerns, the system is both maintainable and extensible.

**Key Features:**
- 7 comprehensive validation rules
- Path reachability analysis for entity flow
- Efficient caching and preprocessing
- Clear, actionable error messages
- Extensible architecture for custom rules
