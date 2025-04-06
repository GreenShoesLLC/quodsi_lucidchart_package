# Phase 1: Core Type Changes

## Overview

Phase 1 focuses on implementing the core type system changes needed to support distribution-based durations. This phase establishes the foundation for the UI implementation and Python integration phases that follow. We'll use a class-based implementation approach for better organization and maintainability.

## Goals

1. Add CONSTANT to the DistributionType enum
2. Create distribution-specific modules with parameter interfaces and implementation classes
3. Create distribution factory and registry
4. Update serialization/deserialization logic

## Tasks

### 1. Update DistributionType Enum

- **File**: `shared/src/types/elements/DistributionType.ts`
- **Changes**:
  - Add CONSTANT to the enum
  - Add helper function for distribution display names
  - Add helper function to determine if a distribution type is supported

**Estimated Time**: 1 day

### 2. Create Distribution Directory Structure

- **New Directory**: `shared/src/types/elements/distributions/`
- **New Files**:
  - `ConstantDistribution.ts` - CONSTANT distribution implementation
  - `UniformDistribution.ts` - UNIFORM distribution implementation
  - `TriangularDistribution.ts` - TRIANGULAR distribution implementation
  - `NormalDistribution.ts` - NORMAL distribution implementation
  - `index.ts` - Re-exports all distributions
  - `DistributionFactory.ts` - Factory methods for creating distributions
- **Changes**:
  - Create parameter interfaces for each distribution type
  - Implement distribution classes with factory and validation methods
  - Create metadata for parameters (labels, descriptions, constraints)

**Estimated Time**: 4 days

### 3. Create Distribution Factory

- **New File**: `shared/src/types/elements/distributions/DistributionFactory.ts`
- **Changes**:
  - Create methods to generate default distributions of each type
  - Implement utility methods for working with distributions
  - Create helper methods for component integration

**Estimated Time**: 2 days

### 4. Update Distribution Class

- **File**: `shared/src/types/elements/Distribution.ts`
- **Changes**:
  - Update DistributionParameters type to include new parameter interfaces
  - Update imports to reference new distribution modules
  - Ensure backward compatibility with existing code

**Estimated Time**: 1 day

### 5. Update Serialization/Deserialization

- **File**: `shared/src/serialization/BaseModelDefinitionSerializer.ts`
- **File**: `shared/src/serialization/ModelDefinitionDeserializer.ts`
- **Changes**:
  - Update serialization to handle CONSTANT as distribution type
  - Update deserialization to convert formats as needed
  - Use distribution classes for creating distributions

**Estimated Time**: 3 days

### 6. Create Unit Tests

- **New Directory**: `shared/tests/types/elements/distributions/`
- **New Files**:
  - `ConstantDistribution.test.ts`
  - `UniformDistribution.test.ts`
  - `TriangularDistribution.test.ts`
  - `NormalDistribution.test.ts`
  - `DistributionFactory.test.ts`
- **Changes**:
  - Create comprehensive tests for each distribution type
  - Test factory methods and validation
  - Test serialization/deserialization

**Estimated Time**: 3 days

## Implementation Details

### Distribution Class Structure

Each distribution type will follow this structure:

```typescript
// ConstantDistribution.ts example
import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";

/**
 * Parameters for a CONSTANT distribution type.
 */
export interface ConstantParameters {
    value: number;
}

/**
 * Default parameters for CONSTANT distribution.
 */
export const DEFAULT_CONSTANT_PARAMETERS: ConstantParameters = {
    value: 1
};

/**
 * Metadata for parameter fields.
 */
export interface ParameterMetadata {
    label: string;
    description: string;
    min?: number;
    max?: number;
    step?: number;
}

/**
 * Metadata for ConstantParameters fields.
 */
export const CONSTANT_PARAMETER_METADATA: Record<keyof ConstantParameters, ParameterMetadata> = {
    value: {
        label: "Value",
        description: "The constant duration value",
        min: 0,
        step: 0.1
    }
};

/**
 * Functions for working with Constant distributions
 */
export class ConstantDistribution {
    /**
     * Creates a default CONSTANT distribution
     */
    static createDefault(): Distribution {
        return ConstantDistribution.create(DEFAULT_CONSTANT_PARAMETERS.value);
    }
    
    /**
     * Creates a CONSTANT distribution with the specified value
     */
    static create(value: number): Distribution {
        return new Distribution(
            DistributionType.CONSTANT,
            { value } as ConstantParameters
        );
    }
    
    /**
     * Validates CONSTANT distribution parameters
     */
    static validateParameters(params: ConstantParameters): boolean {
        return typeof params.value === 'number' && params.value >= 0;
    }
    
    /**
     * Gets the effective value of a CONSTANT distribution
     */
    static getEffectiveValue(params: ConstantParameters): number {
        return params.value;
    }
}
```

### Distribution Factory Structure

The factory will delegate to the distribution-specific classes:

```typescript
// DistributionFactory.ts example
import { Distribution, DistributionParameters } from '../Distribution';
import { DistributionType } from '../DistributionType';
import { Duration, DurationType, PeriodUnit } from '../Duration';

// Import distribution implementations
import {
    ConstantDistribution, ConstantParameters,
    UniformDistribution, UniformParameters,
    TriangularDistribution, TriangularParameters,
    NormalDistribution, NormalParameters
} from './index';

/**
 * Creates a default distribution of the specified type
 */
export function createDefaultDistribution(type: DistributionType): Distribution {
    switch (type) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.createDefault();
        case DistributionType.UNIFORM:
            return UniformDistribution.createDefault();
        case DistributionType.TRIANGULAR:
            return TriangularDistribution.createDefault();
        case DistributionType.NORMAL:
            return NormalDistribution.createDefault();
        default:
            // Default to CONSTANT if type is not supported
            return ConstantDistribution.createDefault();
    }
}

/**
 * Gets a representative value of a distribution (mean, mode, etc.)
 */
export function getDistributionEffectiveValue(distribution: Distribution): number {
    switch (distribution.distributionType) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.getEffectiveValue(distribution.parameters as ConstantParameters);
        case DistributionType.UNIFORM:
            return UniformDistribution.getEffectiveValue(distribution.parameters as UniformParameters);
        case DistributionType.TRIANGULAR:
            return TriangularDistribution.getEffectiveValue(distribution.parameters as TriangularParameters);
        case DistributionType.NORMAL:
            return NormalDistribution.getEffectiveValue(distribution.parameters as NormalParameters);
        default:
            return 0;
    }
}

/**
 * Validates parameters for a specific distribution type
 */
export function validateDistributionParameters(
    type: DistributionType,
    parameters: DistributionParameters
): boolean {
    switch (type) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.validateParameters(parameters as ConstantParameters);
        case DistributionType.UNIFORM:
            return UniformDistribution.validateParameters(parameters as UniformParameters);
        case DistributionType.TRIANGULAR:
            return TriangularDistribution.validateParameters(parameters as TriangularParameters);
        case DistributionType.NORMAL:
            return NormalDistribution.validateParameters(parameters as NormalParameters);
        default:
            return false;
    }
}
```

## Dependencies

- None - this is the first phase

## Deliverables

1. Updated DistributionType enum with CONSTANT added and helper functions
2. Distribution-specific modules with parameter interfaces, metadata, and classes
3. Distribution factory with utility functions
4. Updated Distribution class that integrates with the new modules
5. Updated serialization/deserialization that supports the new format
6. Comprehensive unit tests for all components

## Testing Plan

### Unit Tests

1. **DistributionType Tests**:
   - Test enum values
   - Test display name generation
   - Test supported type checking

2. **Distribution Class Tests**:
   - Test each distribution class separately
   - Test parameter interface compliance
   - Test factory methods
   - Test validation methods
   - Test value calculation

3. **Factory Tests**:
   - Test default distribution creation
   - Test distribution-specific functions
   - Test utility methods

4. **Serialization Tests**:
   - Test serializing distributions
   - Test deserializing distributions
   - Test format conversion
   - Test round-trip serialization/deserialization

### Integration Tests

1. **Model with Distributions**:
   - Create a model with different distribution types
   - Serialize and deserialize the model
   - Verify all distributions are correctly preserved

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex class structure | Medium | Clear documentation and consistent interfaces |
| Type inconsistencies | Medium | Comprehensive unit tests for all edge cases |
| Circular dependencies | Medium | Careful import structure and dependency management |
| Interdependencies with other components | Low | Clear interfaces and isolation of concerns |

## Acceptance Criteria

1. Distribution modules correctly implement parameter interfaces and classes
2. Distribution factory correctly delegates to distribution-specific classes
3. Serialization/deserialization properly handles the new format
4. Distribution-specific unit tests pass
5. Factory and utility function tests pass
6. No regressions in existing functionality

## Next Steps

Upon completion of Phase 1, proceed to Phase 2: UI Implementation with the Enhanced Duration Editor component
