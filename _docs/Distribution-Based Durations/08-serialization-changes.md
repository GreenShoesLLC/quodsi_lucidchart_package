# Serialization Changes

## Overview

The serialization and deserialization processes need to be updated to handle the new approach where CONSTANT is a distribution type. This requires changes to ensure both backward compatibility and support for the new format.

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
  "durationLength": 5, // Maintain for backward compatibility
  "durationPeriodUnit": "MINUTES",
  "durationType": "DISTRIBUTION",
  "distribution": {
    "distributionType": "CONSTANT",
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
protected serializeDuration(duration: Duration): ISerializedDuration {
    try {
        // For backward compatibility, ensure durationLength is set
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
protected deserializeDuration(serialized: ISerializedDuration): Duration {
    try {
        // Handle legacy CONSTANT format
        if (serialized.durationType === DurationType.CONSTANT) {
            // Convert to new format with CONSTANT distribution
            return new Duration(
                serialized.durationLength,
                serialized.durationPeriodUnit,
                DurationType.DISTRIBUTION,
                new Distribution(
                    DistributionType.CONSTANT,
                    { value: serialized.durationLength } as ConstantParameters
                )
            );
        }
        
        // Handle case where distribution is null but should be CONSTANT
        if (serialized.durationType === DurationType.DISTRIBUTION && 
            !serialized.distribution) {
            // Create a CONSTANT distribution with the durationLength value
            return new Duration(
                serialized.durationLength,
                serialized.durationPeriodUnit,
                DurationType.DISTRIBUTION,
                new Distribution(
                    DistributionType.CONSTANT,
                    { value: serialized.durationLength } as ConstantParameters
                )
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

We need to ensure our interfaces properly represent the serialized structure:

```typescript
export interface ISerializedDuration {
    durationLength: number;
    durationPeriodUnit: PeriodUnit;
    durationType: DurationType;
    distribution: Distribution | null;
}

export interface ISerializedDistribution {
    distributionType: DistributionType;
    parameters: DistributionParameters;
    description?: string;
}
```

## Backward Compatibility Strategy

1. **Reading Old Format**:
   - When deserializing, if `durationType` is `CONSTANT`, create a new Distribution of type `CONSTANT` with the `durationLength` as its value
   - Set `durationType` to `DISTRIBUTION` to use the new format

2. **Writing New Format**:
   - When serializing, if distribution type is `CONSTANT`, also set the legacy `durationLength` field to match the `value` parameter
   - This ensures older code can still read the duration value

3. **Gradual Migration**:
   - As models are loaded and saved, they'll automatically migrate to the new format
   - No need for a separate migration script

## Testing Approach

To ensure proper serialization and deserialization:

1. Test deserializing old format:
   ```typescript
   const oldFormatJson = {
     "durationLength": 5,
     "durationPeriodUnit": "MINUTES",
     "durationType": "CONSTANT",
     "distribution": null
   };
   const duration = deserializeDuration(oldFormatJson);
   // Should be: durationType=DISTRIBUTION, distribution.type=CONSTANT, distribution.parameters.value=5
   ```

2. Test serializing new format with CONSTANT distribution:
   ```typescript
   const duration = new Duration(
     5,
     PeriodUnit.MINUTES,
     DurationType.DISTRIBUTION,
     new Distribution(DistributionType.CONSTANT, { value: 5 })
   );
   const serialized = serializeDuration(duration);
   // Should maintain durationLength=5 for backward compatibility
   ```

3. Test round-trip serialization and deserialization for all distribution types
