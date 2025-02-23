# Lucid Platform Types

This directory contains Lucid-specific implementations of simulation objects, mapping Lucid elements (blocks and lines) to their simulation counterparts.

## Base Class

### SimObjectLucid
Abstract base class that implements the `PlatformSimObject` interface from `@quodsi/shared`. Provides common functionality for all Lucid-specific implementations.

## Block-Based Types

These types extend `SimObjectLucid` and work with Lucid `BlockProxy` elements:

- **ActivityLucid**: Maps blocks to simulation activities, managing processing steps and capacities
- **EntityLucid**: Maps blocks to simulation entities that flow through the system
- **GeneratorLucid**: Maps blocks to simulation generators that create entities
- **ResourceLucid**: Maps blocks to simulation resources used by activities
- **ResourceRequirementLucid**: Maps blocks to resource requirements, including clauses and requests

## Line-Based Types

These types extend `SimObjectLucid` and work with Lucid `LineProxy` elements:

- **ConnectorLucid**: Maps lines to simulation connectors, managing the flow between objects

## Common Features

All implementations:
- Use their corresponding simulation object's `createDefault` method when available
- Handle name generation from Lucid element text areas
- Manage element-specific properties and updates
- Use `StorageAdapter` for data persistence

## Usage

Import types from the index:
```typescript
import { 
    ActivityLucid,
    ConnectorLucid,
    // etc
} from '../types';
```

Create a new platform object:
```typescript
const activityLucid = new ActivityLucid(blockProxy, storageAdapter);
const simActivity = activityLucid.getSimulationObject();
```

## Platform Adapters

These types form part of the platform adapter pattern, allowing Quodsi to:
- Support multiple diagramming platforms (Lucid, Miro, etc.)
- Keep platform-specific code separate from core simulation logic
- Maintain consistent interfaces across platforms