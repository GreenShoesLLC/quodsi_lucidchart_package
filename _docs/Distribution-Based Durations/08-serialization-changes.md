# Serialization Changes

## Overview

The serialization and deserialization processes need to be updated to handle our class-based distribution implementation where CONSTANT is a distribution type. This document outlines the changes needed to ensure both forward compatibility and support for the new format.

## Current Serialization

Currently, durations are serialized as:

```json
// CONSTANT duration
{
  "durationLength": 5,
  "durationPeriodUnit": "MINUTES",
  "durationType": "CONSTANT",
  "distribution": null
}

// DISTRIBUTION duration
{
  "durationLength": 0,
  "durationPeriodUnit": "MINUTES",
  "durationType": "DISTRIBUTION",
  "distribution": {
    "distributionType": "uniform",
    "parameters": {
      "low": 3,
      "high": 8
    },
    "description": ""
  }
}
```

## Updated Serialization

With CONSTANT treated as a distribution type, we'll update the serialization to:

```json
// CONSTANT as distribution
{
  "durationLength": 5, // Maintain for compatibility with other components
  "durationPeriodUnit": "MINUTES",
  "durationType": "DISTRIBUTION",
  "distribution": {
    "distributionType": "constant",
    "parameters": {
      "value": 5
    },
    "description": ""
  }
}
```

## Implementation Changes

### Serializer Updates

#### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\serialization\BaseModelDefinitionSerializer.ts
```

#### Updated Code

```typescript
import { 
  ConstantParameters, 
  ConstantDistribution 
} from '../types/elements/distributions';

protected serializeDuration(duration: Duration): ISerializedDuration {
    try {
        // For compatibility with other components, ensure durationLength is set
        // when distribution type is CONSTANT
        let durationLength = duration.durationLength;
        
        if (duration.durationType === DurationType.DISTRIBUTION && 
            duration.distribution?.distributionType === DistributionType.CONSTANT) {
            // Ensure durationLength matches the CONSTANT value
            const constantParams = duration.distribution.parameters as ConstantParameters;
            durationLength = constantParams.value;
        }

        if (durationLength < 0) {
            throw new InvalidModelError('Duration length cannot be negative');
        }

        return {
            durationLength,
            durationPeriodUnit: duration.durationPeriodUnit,
            durationType: duration.durationType,
            distribution: duration.distribution
        };
    } catch (error) {
        throw new SerializationError('Duration', 'Failed to serialize duration', error instanceof Error ? error : undefined);
    }
}
```

### Deserializer Updates

#### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\serialization\ModelDefinitionDeserializer.ts
```

#### Updated Code

```typescript
import { 
  ConstantDistribution 
} from '../types/elements/distributions';

protected deserializeDuration(serialized: ISerializedDuration): Duration {
    try {
        // Since Quodsi is in development, we'll standardize on the new format
        // Handle case where distribution is null or durationType is CONSTANT
        if (serialized.durationType === DurationType.CONSTANT || 
            (serialized.durationType === DurationType.DISTRIBUTION && !serialized.distribution)) {
            
            // Create a CONSTANT distribution using our distribution class
            const constantDistribution = ConstantDistribution.create(serialized.durationLength);
            
            return new Duration(
                serialized.durationLength,
                serialized.durationPeriodUnit,
                DurationType.DISTRIBUTION,
                constantDistribution
            );
        }
        
        // Normal case - distribution is present
        return new Duration(
            serialized.durationLength,
            serialized.durationPeriodUnit,
            serialized.durationType,
            serialized.distribution
        );
    } catch (error) {
        throw new DeserializationError('Duration', 'Failed to deserialize duration', error instanceof Error ? error : undefined);
    }
}
```

## Interface Updates

The interfaces remain the same, but we should document that we're standardizing on the new format:

```typescript
export interface ISerializedDuration {
    durationLength: number;  // Still maintained for component compatibility
    durationPeriodUnit: PeriodUnit;
    durationType: DurationType;  // Always DISTRIBUTION in the new format
    distribution: Distribution | null;  // Never null in the new format
}

export interface ISerializedDistribution {
    distributionType: DistributionType;  // Now includes CONSTANT as an option
    parameters: DistributionParameters;  // Type union now includes ConstantParameters
    description?: string;
}
```

## Compatibility Considerations

1. **Standardizing on New Format**:
   - Since Quodsi is still in development, we can standardize on the new format
   - All durations will use DurationType.DISTRIBUTION with an appropriate Distribution object
   - For CONSTANT distributions, we'll maintain the durationLength field for compatibility with other components

2. **Using Class-Based Implementation**:
   - Use ConstantDistribution.create() instead of direct object creation
   - This ensures consistent distribution creation

3. **Maintaining Field Values**:
   - For CONSTANT distributions, ensure durationLength matches the distribution value

## Testing Approach

To ensure proper serialization and deserialization:

1. Test serializing with class-based distributions:
   ```typescript
   // Create a CONSTANT distribution using the class
   const constantDistribution = ConstantDistribution.create(5);
   
   const duration = new Duration(
     5,
     PeriodUnit.MINUTES,
     DurationType.DISTRIBUTION,
     constantDistribution
   );
   
   const serialized = serializeDuration(duration);
   // Should have: durationLength=5, durationType=DISTRIBUTION, 
   // distribution.distributionType=CONSTANT, distribution.parameters.value=5
   ```

2. Test deserializing legacy format:
   ```typescript
   const legacyFormat = {
     "durationLength": 5,
     "durationPeriodUnit": "MINUTES",
     "durationType": "CONSTANT",
     "distribution": null
   };
   
   const duration = deserializeDuration(legacyFormat);
   // Should be converted to: durationType=DISTRIBUTION, 
   // with distribution created using ConstantDistribution.create()
   ```

3. Test round-trip serialization and deserialization:
   ```typescript
   // Create durations with different distribution types
   const distributions = [
     ConstantDistribution.create(5),
     UniformDistribution.create(0, 10),
     TriangularDistribution.create(0, 5, 10),
     NormalDistribution.create(5, 1)
   ];
   
   // Test round-trip for each
   distributions.forEach(dist => {
     const duration = new Duration(0, PeriodUnit.MINUTES, DurationType.DISTRIBUTION, dist);
     const serialized = serializeDuration(duration);
     const deserialized = deserializeDuration(serialized);
     
     // Verify the distribution type and parameters are preserved
     expect(deserialized.distribution?.distributionType).toBe(dist.distributionType);
     // Type-specific parameter checks...
   });
   ```

## Implementation Strategy

1. Update the serialization/deserialization code to use the class-based approach
2. Add comprehensive unit tests for all serialization/deserialization scenarios
3. Update any code that creates or modifies durations to use the new format
4. Ensure all UI components handle the new format correctly
