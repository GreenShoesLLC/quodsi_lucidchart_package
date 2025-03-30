# Distribution Factory Methods

## Purpose

We need factory methods to:
1. Create default distributions of each type
2. Convert between the old Duration format and the new Distribution-based format
3. Validate distribution parameters

## Implementation

We'll create a new file for factory methods:

```
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\helpers\DistributionFactory.ts
```

## Factory Method Details

### Creating Default Distributions

```typescript
import { Distribution, DistributionParameters, ConstantParameters, UniformParameters, TriangularParameters, NormalParameters } from '../Distribution';
import { DistributionType } from '../DistributionType';
import { DEFAULT_CONSTANT_PARAMETERS, DEFAULT_UNIFORM_PARAMETERS, DEFAULT_TRIANGULAR_PARAMETERS, DEFAULT_NORMAL_PARAMETERS } from '../parameters/metadata';

/**
 * Creates a default distribution of the specified type
 */
export function createDefaultDistribution(type: DistributionType): Distribution {
    let parameters: DistributionParameters;
    
    switch (type) {
        case DistributionType.CONSTANT:
            parameters = { ...DEFAULT_CONSTANT_PARAMETERS };
            break;
        case DistributionType.UNIFORM:
            parameters = { ...DEFAULT_UNIFORM_PARAMETERS };
            break;
        case DistributionType.TRIANGULAR:
            parameters = { ...DEFAULT_TRIANGULAR_PARAMETERS };
            break;
        case DistributionType.NORMAL:
            parameters = { ...DEFAULT_NORMAL_PARAMETERS };
            break;
        default:
            // Default to CONSTANT if type is not supported
            parameters = { ...DEFAULT_CONSTANT_PARAMETERS };
            type = DistributionType.CONSTANT;
    }
    
    return new Distribution(type, parameters);
}

/**
 * Creates a CONSTANT distribution with the specified value
 */
export function createConstantDistribution(value: number): Distribution {
    return new Distribution(
        DistributionType.CONSTANT,
        { value } as ConstantParameters
    );
}

/**
 * Creates a UNIFORM distribution with the specified parameters
 */
export function createUniformDistribution(low: number, high: number): Distribution {
    return new Distribution(
        DistributionType.UNIFORM,
        { low, high } as UniformParameters
    );
}

/**
 * Creates a TRIANGULAR distribution with the specified parameters
 */
export function createTriangularDistribution(left: number, mode: number, right: number): Distribution {
    return new Distribution(
        DistributionType.TRIANGULAR,
        { left, mode, right } as TriangularParameters
    );
}

/**
 * Creates a NORMAL distribution with the specified parameters
 */
export function createNormalDistribution(mean: number, std: number): Distribution {
    return new Distribution(
        DistributionType.NORMAL,
        { mean, std } as NormalParameters
    );
}
```

### Converting Between Formats

```typescript
import { Duration, DurationType, PeriodUnit } from '../Duration';

/**
 * Converts a legacy CONSTANT duration to a distribution-based duration
 */
export function constantToDuration(value: number, periodUnit: PeriodUnit): Duration {
    return new Duration(
        value,
        periodUnit,
        DurationType.DISTRIBUTION,
        createConstantDistribution(value)
    );
}

/**
 * Gets the effective value of a duration (for display/calculation purposes)
 */
export function getDurationEffectiveValue(duration: Duration): number {
    if (duration.durationType === DurationType.CONSTANT) {
        return duration.durationLength;
    }
    
    if (!duration.distribution) {
        return 0;
    }
    
    switch (duration.distribution.distributionType) {
        case DistributionType.CONSTANT:
            return (duration.distribution.parameters as ConstantParameters).value;
        case DistributionType.UNIFORM:
            const uniformParams = duration.distribution.parameters as UniformParameters;
            return (uniformParams.low + uniformParams.high) / 2; // Mean
        case DistributionType.TRIANGULAR:
            const triangularParams = duration.distribution.parameters as TriangularParameters;
            return (triangularParams.left + triangularParams.mode + triangularParams.right) / 3; // Mean
        case DistributionType.NORMAL:
            return (duration.distribution.parameters as NormalParameters).mean;
        default:
            return 0;
    }
}
```

### Validation Methods

```typescript
/**
 * Validates parameters for a specific distribution type
 * Returns true if valid, false otherwise
 */
export function validateDistributionParameters(
    type: DistributionType,
    parameters: DistributionParameters
): boolean {
    switch (type) {
        case DistributionType.CONSTANT:
            const constantParams = parameters as ConstantParameters;
            return typeof constantParams.value === 'number' && constantParams.value >= 0;
            
        case DistributionType.UNIFORM:
            const uniformParams = parameters as UniformParameters;
            return (
                typeof uniformParams.low === 'number' &&
                typeof uniformParams.high === 'number' &&
                uniformParams.low >= 0 &&
                uniformParams.high > uniformParams.low
            );
            
        case DistributionType.TRIANGULAR:
            const triangularParams = parameters as TriangularParameters;
            return (
                typeof triangularParams.left === 'number' &&
                typeof triangularParams.mode === 'number' &&
                typeof triangularParams.right === 'number' &&
                triangularParams.left >= 0 &&
                triangularParams.mode >= triangularParams.left &&
                triangularParams.right >= triangularParams.mode
            );
            
        case DistributionType.NORMAL:
            const normalParams = parameters as NormalParameters;
            return (
                typeof normalParams.mean === 'number' &&
                typeof normalParams.std === 'number' &&
                normalParams.mean >= 0 &&
                normalParams.std > 0
            );
            
        default:
            return false;
    }
}
```
