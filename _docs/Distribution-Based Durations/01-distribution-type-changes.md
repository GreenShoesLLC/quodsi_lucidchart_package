# Distribution Type Changes

## Current Implementation

The current system uses two separate enums:

1. `DurationType` - Defines whether a duration is CONSTANT or DISTRIBUTION
2. `DistributionType` - Defines the type of distribution (UNIFORM, TRIANGULAR, etc.)

## Proposed Changes

### 1. Update DistributionType Enum

Add `CONSTANT` to the `DistributionType` enum to treat it as just another distribution:

```typescript
// Current DistributionType enum
export enum DistributionType {
    MULTINOMIAL = "multinomial",
    UNIFORM = "uniform",
    TRIANGULAR = "triangular",
    // ... other distributions
}

// Modified DistributionType enum
export enum DistributionType {
    CONSTANT = "constant", // Add CONSTANT as first option
    UNIFORM = "uniform",
    TRIANGULAR = "triangular",
    NORMAL = "normal",
    // ... other distributions
}
```

### 2. Create Distribution-Specific Modules

Create a dedicated module for each distribution type, containing:
- Parameter interface definition
- Default parameters
- Parameter metadata
- Distribution class with factory methods
- Validation methods
- Value calculation methods

For example, for the CONSTANT distribution:

```typescript
// ConstantDistribution.ts
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
    static createDefault(): Distribution {
        return ConstantDistribution.create(DEFAULT_CONSTANT_PARAMETERS.value);
    }
    
    static create(value: number): Distribution {
        return new Distribution(
            DistributionType.CONSTANT,
            { value } as ConstantParameters
        );
    }
    
    static validateParameters(params: ConstantParameters): boolean {
        return typeof params.value === 'number' && params.value >= 0;
    }
    
    static getEffectiveValue(params: ConstantParameters): number {
        return params.value;
    }
}
```

### 3. Create a Central Distribution Factory

Create a factory module that delegates to the specific distribution classes:

```typescript
// DistributionFactory.ts
import { Distribution, DistributionParameters } from '../Distribution';
import { DistributionType } from '../DistributionType';
import { Duration, DurationType, PeriodUnit } from '../Duration';

// Import distribution implementations
import { ConstantDistribution, ConstantParameters } from './ConstantDistribution';
import { UniformDistribution, UniformParameters } from './UniformDistribution';
// ... other imports

export function createDefaultDistribution(type: DistributionType): Distribution {
    switch (type) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.createDefault();
        case DistributionType.UNIFORM:
            return UniformDistribution.createDefault();
        // ... other cases
        default:
            return ConstantDistribution.createDefault();
    }
}

// Other utility functions...
```

## Implementation Directory Structure

```
shared/src/types/elements/
├── DistributionType.ts
├── Distribution.ts
├── distributions/
│   ├── index.ts                      # Re-exports all distribution types
│   ├── ConstantDistribution.ts       # CONSTANT distribution implementation
│   ├── UniformDistribution.ts        # UNIFORM distribution implementation
│   ├── TriangularDistribution.ts     # TRIANGULAR distribution implementation
│   ├── NormalDistribution.ts         # NORMAL distribution implementation
│   └── DistributionFactory.ts        # Factory and utility functions
```

## Implications

1. `DurationType` will become less important, as all durations will use `DurationType.DISTRIBUTION`
2. The UI will show a single dropdown for distribution type, with CONSTANT as the default option
3. Duration objects will always have a `distribution` property, even for constant durations
4. Each distribution type will be a self-contained module with all related functionality
5. Adding new distribution types will be simpler and more organized

## Backward Compatibility

While we transition to this new model:

1. We'll maintain the existing `DurationType` enum
2. For durations using the old CONSTANT type, we'll create a CONSTANT distribution when deserializing
3. For durations using the new CONSTANT distribution, we'll set both the distribution and the legacy `durationLength` field
4. The factory includes helper functions to facilitate conversion between formats

## Testing Strategy

Unit tests will be created for:
1. Each distribution class (create, validate, calculate)
2. The distribution factory (creation, conversion, utility functions)
3. Backward compatibility (deserialization of legacy formats)
