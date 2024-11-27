# Quodsi Component Selector Implementation Specification

## Overview
Implement a new simulation component selection system across both QuodsiLucid and QuodsiReact applications, enabling users to change component types for selected Lucidchart shapes while maintaining proper data synchronization and logging.

## System Components

### 1. Shared Type Definitions

```typescript
// simComponentTypes.ts - shared between both applications
export enum SimComponentType {
  ACTIVITY = 'activity',
  GENERATOR = 'generator', 
  CONNECTOR = 'connector',
  MODEL = 'model',
  ENTITY = 'entity',
  RESOURCE = 'resource'
}

export interface SimComponentTypeInfo {
  type: SimComponentType;
  displayName: string;
  description: string;
}

export const SimComponentTypes: SimComponentTypeInfo[] = [
  {
    type: SimComponentType.ACTIVITY,
    displayName: 'Activity',
    description: 'Process or task node'
  },
  // Add other component definitions
];
```

### 2. QuodsiReact Changes

#### New Component: SimulationComponentSelector
```typescript
interface SimulationComponentSelectorProps {
  currentType?: SimComponentType;
  onTypeChange: (newType: SimComponentType) => void;
}
```

Key Features:
- Dropdown displaying all SimComponentTypes
- Placeholder state for uninitialized shapes
- Posts componentTypeChanged message on selection
- Renders above current editor component
- Maintains selection state synchronized with editor type

Logging Requirements:
- Log component initialization with currentType
- Log all type change attempts
- Log successful/failed type changes
- Log related editor mount/unmount events

#### App.tsx Updates
- Add SimulationComponentSelector above editor components
- Handle componentTypeChanged messages
- Update editor rendering logic
- Add logging for component lifecycle and state changes

### 3. QuodsiLucid Changes

#### Enhanced QuodsiShapeData Class
```typescript
class QuodsiShapeData {
  setComponentType(type: SimComponentType): void;
  setComponentData(data: any): void;
  getComponentType(): SimComponentType | undefined;
  getComponentData(): any;
  
  // New comprehensive method
  updateComponent(type: SimComponentType, data: any): void;
}
```

Logging Requirements:
- Log all shape data modifications
- Log validation failures
- Log data synchronization events

#### Right-panel.ts Updates
- Use QuodsiShapeData methods for all shape updates
- Handle componentTypeChanged messages
- Validate shape data integrity
- Add comprehensive logging

## Communication Protocol

### New Message Types
1. componentTypeChanged
```typescript
{
  messagetype: 'componentTypeChanged',
  simtype: SimComponentType,
  lucidId: string
}
```

2. componentTypeUpdateComplete
```typescript
{
  messagetype: 'componentTypeUpdateComplete',
  success: boolean,
  error?: string,
  lucidId: string
}
```

### Logging Requirements

#### Debug Messages
All logging should follow this format:
```typescript
console.log('[Context] Action:', {
  timestamp: new Date().toISOString(),
  details: {/* relevant data */},
  location: 'FileName:LineNumber'
});
```

Required Log Points:
1. Component Selection
```typescript
[SimComponentSelector] Type change initiated: {
  from: previousType,
  to: newType,
  shapeId: lucidId
}
```

2. Shape Data Updates
```typescript
[QuodsiShapeData] Updating shape data: {
  shapeId: lucidId,
  type: SimComponentType,
  previousType: oldType,
  dataSize: byteLength
}
```

3. Message Communication
```typescript
[MessageHandler] Message received: {
  type: messageType,
  payload: messageData,
  source: messageOrigin
}
```

## Implementation Steps
1. Create shared type definitions
2. Implement QuodsiShapeData enhancements
3. Create SimulationComponentSelector
4. Update App.tsx integration
5. Enhance right-panel.ts message handling
6. Add comprehensive logging
7. Test component type transitions

## Edge Cases & Error Handling
- Handle invalid type transitions
- Manage interrupted save operations
- Handle network failures
- Preserve data during type changes
- Validate shape compatibility

## Future Considerations
- Component type transition validations
- Undo/redo support
- Batch operations
- Performance optimization for logging
