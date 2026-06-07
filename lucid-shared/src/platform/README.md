# Platform Abstraction Layer

This directory contains the core platform abstraction interfaces and types that enable Quodsi to work with different diagramming platforms.

## Core Types

### PlatformSimObject
Interface that defines the contract between platform-specific implementations and core simulation objects.

```typescript
interface PlatformSimObject<T extends SimulationObject> {
    readonly platformElementId: string;
    readonly type: SimulationObjectType;
    
    getSimulationObject(): T;
    updateFromPlatform(): void;
    validate(): boolean;
    getMetadata(): Record<string, unknown>;
}
```

### PlatformType
Enumeration and utilities for supported platforms.

```typescript
enum PlatformType {
    Lucid = 'Lucid',
    Miro = 'Miro',
    Canva = 'Canva'
}
```

## Purpose

This abstraction layer:
- Defines the core contract for platform implementations
- Ensures consistent behavior across different platforms
- Separates platform-specific code from simulation logic
- Makes it easier to add support for new platforms

## Implementation Guide

To add support for a new platform:

1. Create a new project/package for the platform
2. Implement PlatformSimObject for each simulation object type:
   - Activities
   - Connectors
   - Entities
   - Generators
   - Resources
   - Resource Requirements

3. Map platform-specific elements to simulation objects:
   ```typescript
   class MyPlatformActivity implements PlatformSimObject<Activity> {
       constructor(platformElement: PlatformSpecificType) {
           // Initialize
       }
       
       // Implement interface methods
   }
   ```

4. Handle platform-specific storage and updates

## Current Platforms

Currently supported platforms:
- Lucid (LucidChart diagrams)
- More platforms coming soon...

## Best Practices

- Keep platform-specific logic contained in the platform implementation
- Use the shared types and interfaces for consistency
- Follow the established naming patterns
- Maintain separation between platform and simulation concerns