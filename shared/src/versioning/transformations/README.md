# Transformations

This directory contains the data structure transformations used to upgrade Quodsi simulation objects between versions.

## Directory Structure

```
/transformations/
  - TransformationTypes.ts    # Core types for transformations
  - index.ts                  # Exports and consolidates transformations
  
  # Simulation Object Transformations
  - ActivityTransforms.ts     # Activity transformations (e.g., RouteType)
  - ConnectorTransforms.ts    # Connector transformations (e.g., Logic scripts)
  - EntityTransforms.ts       # Entity transformations
  - GeneratorTransforms.ts    # Generator transformations
  - ResourceTransforms.ts     # Resource transformations
  - ModelTransforms.ts        # Model/ModelDefinition transformations
```

## Core Types

### VersionTransformation
Represents a transformation between specific versions:
```typescript
interface VersionTransformation {
    sourceVersion: string;
    targetVersion: string;
    transform: (data: any) => any;
}
```

### TransformationSet
Collection of transformations for a specific object type:
```typescript
interface TransformationSet {
    objectType: string;
    transformations: VersionTransformation[];
}
```

## Adding New Transformations

1. **Update Existing Type**
```typescript
export const ActivityTransforms: TransformationSet = {
    objectType: 'Activity',
    transformations: [
        {
            sourceVersion: '1.0.0',
            targetVersion: '1.1.0',
            transform: (data: any) => ({
                ...data,
                routeType: 'FIFO' // Add new property
            })
        }
    ]
};
```

2. **Add New Type**
- Create new file `NewTypeTransforms.ts`
- Define transformations
- Export from index.ts
- Add to AllTransformations array

## Current Transformations

### Activity (1.0.0 → 1.1.0)
- Added `routeType` property (default: 'FIFO')
- Options: FIFO, LIFO

### Connector (1.0.0 → 1.1.0)
- Added `logic` property for Python scripts
- Default: null

### Other Types
- Entity, Generator, Resource currently maintain structure
- Ready for future transformations

## Best Practices

1. **Data Safety**
- Always spread existing data first (`...data`)
- Add new properties after spread
- Never remove properties without documentation

2. **Defaults**
- Always provide sensible defaults
- Document default values
- Consider platform requirements

3. **Validation**
- Type check incoming data
- Validate new property values
- Handle missing or invalid data

4. **Documentation**
- Document changes in transformations
- Update relevant README files
- Note breaking changes

## Testing

Each transformation should have tests verifying:
1. Data structure integrity
2. Default value application
3. Edge cases handling
4. Backward compatibility (if needed)

## Example Usage

```typescript
import { getTransformations } from './index';

// Get transformations for specific type
const activityTransforms = getTransformations('Activity');

// Get all transformations between versions
const transformations = getTransformationsBetweenVersions('1.0.0', '1.1.0');
```