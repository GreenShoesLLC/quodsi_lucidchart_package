# Distribution Type Changes

## Current Implementation

The current system uses two separate enums:

1. `DurationType` - Defines whether a duration is CONSTANT or DISTRIBUTION
2. `DistributionType` - Defines the type of distribution (UNIFORM, TRIANGULAR, etc.)

## Proposed Changes

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

## Implications

1. `DurationType` will become less important, as all durations will use `DurationType.DISTRIBUTION`
2. The UI will show a single dropdown for distribution type, with CONSTANT as the default option
3. Duration objects will always have a `distribution` property, even for constant durations

## Backward Compatibility

While we transition to this new model:

1. We'll maintain the existing `DurationType` enum
2. For durations using the old CONSTANT type, we'll create a CONSTANT distribution when deserializing
3. For durations using the new CONSTANT distribution, we'll set both the distribution and the legacy `durationLength` field

## Implementation File

```
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\DistributionType.ts
```

## Code Changes

```typescript
export enum DistributionType {
    CONSTANT = "constant", // New option
    MULTINOMIAL = "multinomial",
    UNIFORM = "uniform",
    TRIANGULAR = "triangular",
    NORMAL = "normal",
    // ... other distributions
}

// Add helper for display names
export function getDistributionDisplayName(type: DistributionType): string {
    switch (type) {
        case DistributionType.CONSTANT:
            return "Constant";
        case DistributionType.UNIFORM:
            return "Uniform";
        case DistributionType.TRIANGULAR:
            return "Triangular";
        case DistributionType.NORMAL:
            return "Normal";
        // ... other cases
        default:
            return type.toString().replace(/_/g, ' ').toLowerCase()
                .replace(/\b\w/g, char => char.toUpperCase());
    }
}

// Add helper for determining if a distribution is supported in the UI
export function isDistributionTypeSupported(type: DistributionType): boolean {
    const supportedTypes = [
        DistributionType.CONSTANT,
        DistributionType.UNIFORM,
        DistributionType.TRIANGULAR, 
        DistributionType.NORMAL
    ];
    
    return supportedTypes.includes(type);
}
```
