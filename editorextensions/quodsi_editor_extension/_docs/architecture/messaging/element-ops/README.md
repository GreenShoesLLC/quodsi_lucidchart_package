# Element Operations Messages

Operations on individual simulation objects (Activities, Resources, etc.).

## Messages

### [ELEMENT_UPDATE](./element-update.md)
**Direction:** React → Extension (request), Extension → React (result)
**Purpose:** Update properties of a simulation element

**Flow:**
```
User edits form → Clicks Save → ELEMENT_UPDATE →
Extension updates element → ELEMENT_UPDATE_RESULT → React shows feedback
```

### [ELEMENT_CONVERT](./element-convert.md)
**Direction:** React → Extension (request), Extension → React (result)
**Purpose:** Convert element to different simulation type

**Flow:**
```
User selects convert → ELEMENT_CONVERT →
Extension changes type → ELEMENT_CONVERT_RESULT → React updates UI
```

## Walkthroughs

These concrete examples show the complete round-trip message flow for different element types, ordered from simplest to most complex:

### [Entity Update Walkthrough](./entity-update-walkthrough.md)
**Concrete example:** Step-by-step walkthrough of updating an Entity's name property.

**Focus:** Simplest element type - ideal reference for understanding core update flow
**Complexity:** Low (4 properties, single input field, no transformations)

### [Resource Update Walkthrough](./resource-update-walkthrough.md)
**Concrete example:** Step-by-step walkthrough of updating a Resource's capacity, showing financial properties object handling.

**Focus:** Low-moderate complexity with optional financial properties object and multi-tab UI
**Complexity:** Low-Moderate (5 properties + financial object, 3-tab UI, serialization for financial properties)

### [Generator Update Walkthrough](./generator-update-walkthrough.md)
**Concrete example:** Step-by-step walkthrough of updating a Generator's interarrival time, showing Duration object handling and immediate save pattern.

**Focus:** Moderate complexity with Duration objects and immediate save on duration changes
**Complexity:** Moderate (11 properties, Duration objects, entity references, state modifications, immediate save pattern)

### [Model Update Walkthrough](./model-update-walkthrough.md)
**Concrete example:** Step-by-step walkthrough of updating Model properties (replications count), showing page-level configuration.

**Focus:** Page-level update (PageProxy storage)
**Complexity:** Medium (simulation configuration, time settings, different selection detection)

### [Activity Update Walkthrough](./activity-update-walkthrough.md)
**Concrete example:** Step-by-step walkthrough of updating an Activity's name property, showing complex data transformations and nested objects.

**Focus:** Complex element-level update (BlockProxy storage)
**Complexity:** High (10+ properties, tabbed UI, operation steps, resource requirements, state modifications)

## Request/Response Pattern

All element operations follow this pattern:

**Request:**
```typescript
{
  elementId: string,
  type: string,
  data: object  // Operation-specific
}
```

**Response:**
```typescript
{
  success: boolean,
  elementId: string,
  errorMessage?: string
}
```

## Common Workflows

**Edit Element:**
1. User selects element (SELECTION_CHANGED)
2. React shows appropriate editor
3. User modifies properties
4. ELEMENT_UPDATE → Extension
5. Extension updates LucidChart element
6. Extension validates model
7. ELEMENT_UPDATE_RESULT → React
8. React shows success/error

**Convert Element:**
1. User clicks "Convert to..."
2. ELEMENT_CONVERT → Extension
3. Extension changes element type
4. Extension rebuilds model
5. ELEMENT_CONVERT_RESULT → React
6. SELECTION_CHANGED with new type

## Error Handling

- Element not found
- Invalid data format
- Validation failures
- Storage errors

All errors reported in result message.

## Integration

**Extension:**
- `ElementOpsHandler` processes requests
- `StorageAdapter` updates element data
- `ModelManager` triggers validation

**React:**
- `modelOpsSender` creates requests
- `mapElementOps` handles results
- Element editors initiate operations
