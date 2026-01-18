# Unique Names Per Type - Design Document

## Overview

Enforce unique names for simulation objects within each type (e.g., no two Activities can share a name, but an Activity and Resource can both be named "Triage").

## Requirements

| Requirement | Decision |
|-------------|----------|
| **Scope** | Per-type uniqueness |
| **Enforcement timing** | Conversion time and edit time |
| **Conversion resolution** | Auto-suffix with truncated block ID |
| **Edit-time UX** | Inline error, save blocked until unique |
| **Architecture** | Core validation in `@quodsi/shared`, called by extension and React |
| **Migration** | Not needed - applies to new work only |

## Implementation

### 1. Core Validation in Shared Library

**File:** `shared/src/types/ModelDefinition.ts`

Add methods to check name uniqueness:

```typescript
/**
 * Checks if a name is unique among objects of the given type.
 * @param type - The simulation object type to check within
 * @param name - The name to check
 * @param excludeId - Optional ID to exclude (for editing existing objects)
 * @returns true if the name is unique, false if it conflicts
 */
public isNameUniqueForType(
  type: SimulationObjectType,
  name: string,
  excludeId?: string
): boolean {
  const objects = this.getObjectsByType(type);
  return !objects.some(obj =>
    obj.name === name && obj.id !== excludeId
  );
}

/**
 * Gets all names currently in use for a given type.
 * Useful for UI autocomplete or conflict resolution.
 */
public getUsedNamesForType(type: SimulationObjectType): string[] {
  return this.getObjectsByType(type).map(obj => obj.name);
}
```

### 2. Name Generation Utility

**File:** `shared/src/utils/nameUtils.ts` (new file)

```typescript
import { ModelDefinition } from '../types/ModelDefinition';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';

/**
 * Generates a unique name by appending a truncated element ID suffix.
 * @param baseName - The original name (e.g., "Triage")
 * @param elementId - The platform element ID to use as suffix
 * @param suffixLength - How many characters of ID to append (default: 6)
 * @returns Unique name like "Triage_a1b2c3"
 */
export function generateUniqueName(
  baseName: string,
  elementId: string,
  suffixLength: number = 6
): string {
  const suffix = elementId.slice(-suffixLength);
  return `${baseName}_${suffix}`;
}

/**
 * Ensures a name is unique for the given type, generating a suffixed
 * version if necessary.
 * @param model - The ModelDefinition to check against
 * @param type - The simulation object type
 * @param name - The desired name
 * @param elementId - The element ID for suffix generation
 * @returns The original name if unique, or a suffixed version
 */
export function ensureUniqueName(
  model: ModelDefinition,
  type: SimulationObjectType,
  name: string,
  elementId: string
): string {
  if (model.isNameUniqueForType(type, name)) {
    return name;
  }
  return generateUniqueName(name, elementId);
}
```

### 3. Extension Layer Integration

**File:** `editorextensions/quodsi_editor_extension/src/services/conversion/LucidPageConversionService.ts`

In `convertElementsWithMappings()`, after creating each simulation object:

```typescript
import { ensureUniqueName } from '@quodsi/shared';

// After creating platformObject:
const element = platformObject.getSimulationObject();

// Get current model from ModelManager
const model = this.modelManager.getModelDefinition();

// Ensure unique name before registration
element.name = ensureUniqueName(
  model,
  targetType,
  element.name,
  blockId
);

// Now register with the unique name
await this.modelManager.registerElement(element, block);
```

Apply the same pattern in:
- `convertBlocks()`
- `convertConnections()`

**Note:** The first element with a given name keeps the original; subsequent duplicates get suffixed. Order is determined by `page.allBlocks` iteration.

### 4. React UI Integration

Leverage existing `EditorReferenceData` which already contains `{ id, name }` for each type.

**File:** `shared/src/utils/nameValidation.ts` (new file)

```typescript
import { EditorReferenceData } from '../types/EditorReferenceData';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';

/**
 * Checks if a name is unique within the reference data for a given type.
 * @param referenceData - The EditorReferenceData from the extension
 * @param type - The simulation object type
 * @param name - The name to check
 * @param excludeId - Current element ID (when editing)
 */
export function isNameUniqueInReferenceData(
  referenceData: EditorReferenceData,
  type: SimulationObjectType,
  name: string,
  excludeId?: string
): boolean {
  const items = getItemsForType(referenceData, type);
  return !items.some(item =>
    item.name === name && item.id !== excludeId
  );
}

function getItemsForType(
  data: EditorReferenceData,
  type: SimulationObjectType
): Array<{ id: string; name: string }> {
  switch (type) {
    case SimulationObjectType.Activity: return data.activities || [];
    case SimulationObjectType.Resource: return data.resources || [];
    case SimulationObjectType.Generator: return data.generators || [];
    case SimulationObjectType.Entity: return data.entities || [];
    default: return [];
  }
}
```

**Editor component changes:**

- On name field change, call `isNameUniqueInReferenceData()`
- If not unique, show inline error: "An Activity named 'Triage' already exists"
- Disable save button while name is not unique

### 5. Testing

**Shared library tests:**

`shared/src/utils/__tests__/nameUtils.test.ts`:
- `generateUniqueName()` appends truncated ID correctly
- `ensureUniqueName()` returns original when unique
- `ensureUniqueName()` returns suffixed when duplicate exists

`shared/src/types/__tests__/ModelDefinition.test.ts`:
- `isNameUniqueForType()` returns true when no conflict
- `isNameUniqueForType()` returns false when name exists for same type
- `isNameUniqueForType()` returns true when name exists for different type
- `isNameUniqueForType()` excludes specified ID from check

**React tests:**

`isNameUniqueInReferenceData()`:
- Detects duplicate activity names
- Allows same name across different types
- Excludes current element when editing

**Integration tests:**

- Conversion service produces unique names when source blocks have duplicate text

## Files to Create/Modify

| File | Action |
|------|--------|
| `shared/src/types/ModelDefinition.ts` | Add `isNameUniqueForType()`, `getUsedNamesForType()` |
| `shared/src/utils/nameUtils.ts` | Create with `generateUniqueName()`, `ensureUniqueName()` |
| `shared/src/utils/nameValidation.ts` | Create with `isNameUniqueInReferenceData()` |
| `shared/src/utils/index.ts` | Export new utilities |
| `LucidPageConversionService.ts` | Call `ensureUniqueName()` during conversion |
| Editor components (Activity, Resource, Generator, Entity) | Add name validation and inline errors |
| Test files | Add unit and integration tests |

## Open Questions

None - all decisions made during brainstorming.
