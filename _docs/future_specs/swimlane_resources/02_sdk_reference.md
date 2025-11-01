# Lucid SDK Reference for Swimlanes

## Overview

This document provides a comprehensive reference for the Lucid Extension SDK APIs related to swimlanes, lanes, and container detection. All information is based on research of the official Lucid developer documentation and SDK package.

## Key API Components

### 1. BlockProxy Class

The `BlockProxy` class represents a single shape (block) on a LucidChart document.

**Import:**
```typescript
import { BlockProxy } from 'lucid-extension-sdk';
```

#### Core Methods

##### `getClassName(): string`

Returns the class name of the block, which identifies its type.

**Example:**
```typescript
const block: BlockProxy = /* ... */;
const className = block.getClassName();

console.log(className); // e.g., "ProcessBlock", "TerminatorBlockV2", "TableBlock"
```

**Use for lane detection:**
Look for class names containing "Swimlane", "Lane", "Table", or similar identifiers.

##### `properties: MapProxy`

Access to the block's properties as a key-value store.

**Example:**
```typescript
const block: BlockProxy = /* ... */;

// Get a specific property
const laneProperty = block.properties.get('lane');
const swimlaneProperty = block.properties.get('swimlane');
const $lanes = block.properties.get('$lanes');

// Iterate all properties
for (const [key, value] of block.properties) {
    console.log(`${key}: ${value}`);
}
```

**Use for lane detection:**
Check for properties like `lane`, `swimlane`, `$lanes`, `laneIndex`, etc.

##### `parent: ItemProxy | undefined`

Returns the parent container of this block, if any.

**Example:**
```typescript
const block: BlockProxy = /* ... */;

if (block.parent && block.parent instanceof BlockProxy) {
    const parentClass = block.parent.getClassName();
    console.log('Parent class:', parentClass);

    // Check if parent is a swimlane
    if (parentClass.includes('Swimlane')) {
        console.log('This block is inside a swimlane!');
    }
}
```

**Use for lane detection:**
If a block's parent is a swimlane, the block might be a lane or contained within a lane.

##### `textAreas: MapProxy<string, string>`

Access to the text content of the block's text areas.

**Example:**
```typescript
const block: BlockProxy = /* ... */;

// Get the first text area (often the main label)
const textAreaKeys = Array.from(block.textAreas.keys());
if (textAreaKeys.length > 0) {
    const labelText = block.textAreas.get(textAreaKeys[0]);
    console.log('Lane label:', labelText); // e.g., "Customer Service (3 agents)"
}
```

**Use for lane detection:**
Parse lane names and capacity from text areas.

### 2. The `$lanes` Attribute

**Source:** [Lucid SDK Attributes Documentation](https://developer.lucid.co/docs/attributes-syntax)

The `this.$lanes` attribute is used in Lucid's formula/attribute system and returns an array of object references to the individual lanes of a swimlane shape.

#### Availability

**Context:** Shape formulas, custom shape definitions, potentially accessible via properties

**Type:** Array of lane object references

**Example (Conceptual):**
```typescript
// Accessing $lanes might require property access
const lanesData = block.properties.get('$lanes');

if (lanesData && Array.isArray(lanesData)) {
    console.log(`Swimlane has ${lanesData.length} lanes`);

    lanesData.forEach((lane, index) => {
        console.log(`Lane ${index}:`, lane);
    });
}
```

**Note:** The exact mechanism to access `$lanes` from TypeScript extension code requires testing. It may be available as:
- `block.properties.get('$lanes')`
- Part of shape data
- Only accessible in formula context

### 3. TableBlockProxy Class

Swimlanes may be implemented using table structures, making `TableBlockProxy` relevant.

**Import:**
```typescript
import { TableBlockProxy } from 'lucid-extension-sdk';
```

**Type checking:**
```typescript
const block: BlockProxy = /* ... */;

if (block instanceof TableBlockProxy) {
    console.log('This is a table block (possibly a swimlane)');

    // TableBlockProxy has specific methods for rows/columns
    // which might correspond to lanes
}
```

#### Relevant Methods (Hypothetical)

**Note:** The exact API for TableBlockProxy lanes needs verification from actual testing. Potential methods:

```typescript
// Hypothetical API - verify with testing
interface TableBlockProxy extends BlockProxy {
    getRows(): RowProxy[];
    getColumns(): ColumnProxy[];
    getCell(row: number, col: number): CellProxy;
}
```

If swimlanes are implemented as tables:
- Rows might represent horizontal lanes
- Columns might represent vertical lanes

### 4. The `$contents` Attribute

Returns all shapes that have their top-left corner within the boundaries of a container.

**Source:** [Lucid SDK Attributes Documentation](https://developer.lucid.co/docs/attributes-syntax)

**Example:**
```typescript
const container: BlockProxy = /* swimlane or lane */;

// Get contents (activities within the lane)
const contents = container.properties.get('$contents');

if (contents && Array.isArray(contents)) {
    console.log(`Lane contains ${contents.length} shapes`);
}
```

**Use for lane-Resource mapping:**
When a lane is converted to a Resource, activities in `$contents` should automatically get resource requirements for that Resource.

### 5. CustomBlockProxy Class

If swimlanes are implemented as custom shapes, use `CustomBlockProxy` for detection.

**Import:**
```typescript
import { CustomBlockProxy } from 'lucid-extension-sdk';
```

**Type checking:**
```typescript
const block: BlockProxy = /* ... */;

if (block instanceof CustomBlockProxy) {
    // Check if it's a specific custom shape
    if (block.isFromStencil('standard-library', 'swimlane')) {
        console.log('This is a swimlane from standard library');
    }
}
```

**Method:** `isFromStencil(libraryName: string, shapeName: string): boolean`

### 6. ItemProxy and ElementProxy

Base classes for all diagram items.

**Type hierarchy:**
```typescript
ItemProxy (base)
  ├─ ElementProxy
  │   ├─ BlockProxy
  │   │   ├─ TableBlockProxy
  │   │   ├─ CustomBlockProxy
  │   │   └─ ERDBlockProxy
  │   └─ LineProxy
  └─ GroupProxy
```

**Checking item type:**
```typescript
import { ItemProxy, BlockProxy, LineProxy } from 'lucid-extension-sdk';

function identifyItem(item: ItemProxy) {
    if (item instanceof BlockProxy) {
        console.log('This is a block');
    } else if (item instanceof LineProxy) {
        console.log('This is a line');
    }
}
```

## Property Access Patterns

### Standard Property Access

```typescript
const block: BlockProxy = /* ... */;

// Read property
const value = block.properties.get('propertyName');

// Check if property exists
if (block.properties.has('propertyName')) {
    // Property exists
}

// Iterate all properties
for (const [key, value] of block.properties) {
    console.log(`${key}: ${value}`);
}

// Get all keys
const keys = Array.from(block.properties.keys());
```

### Shape Data Access

Blocks can also have custom shape data:

```typescript
const block: BlockProxy = /* ... */;

// Access shape data (if available)
// Note: Exact API may vary
const shapeData = block.shapeData; // or similar property

// Custom data fields set by users or shapes
```

## Detection Patterns

### Pattern 1: Class Name Detection

```typescript
function isSwimlaneLane(block: BlockProxy): boolean {
    const className = block.getClassName();

    // Check for swimlane-related class names
    return className.includes('Swimlane') ||
           className.includes('Lane') ||
           className.includes('Pool'); // BPMN pools
}
```

### Pattern 2: Property-Based Detection

```typescript
function isSwimlaneLane(block: BlockProxy): boolean {
    // Check for lane-specific properties
    return block.properties.has('lane') ||
           block.properties.has('laneIndex') ||
           block.properties.has('swimlane');
}
```

### Pattern 3: Parent-Child Detection

```typescript
function isSwimlaneLane(block: BlockProxy): boolean {
    if (!block.parent || !(block.parent instanceof BlockProxy)) {
        return false;
    }

    const parentClass = block.parent.getClassName();
    return parentClass.includes('Swimlane');
}
```

### Pattern 4: Table Structure Detection

```typescript
function isSwimlaneLane(block: BlockProxy): boolean {
    // Check if this is a row/column in a table that acts as a swimlane
    if (block instanceof TableBlockProxy) {
        return false; // Table itself, not a lane
    }

    if (block.parent && block.parent instanceof TableBlockProxy) {
        // This might be a lane (row/column within table)
        return true;
    }

    return false;
}
```

## Complete Detection Function

Combining multiple strategies:

```typescript
import { BlockProxy, TableBlockProxy, CustomBlockProxy } from 'lucid-extension-sdk';

interface LaneDetectionResult {
    isLane: boolean;
    confidence: 'high' | 'medium' | 'low';
    detectionMethod: string;
    laneName?: string;
    capacity?: number;
}

function detectSwimlaneLane(block: BlockProxy): LaneDetectionResult {
    const className = block.getClassName();

    // High confidence: Class name match
    if (className.includes('Lane') || className.includes('Swimlane')) {
        return {
            isLane: true,
            confidence: 'high',
            detectionMethod: 'className',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Medium confidence: Property match
    if (block.properties.has('lane') || block.properties.has('$lanes')) {
        return {
            isLane: true,
            confidence: 'medium',
            detectionMethod: 'properties',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Medium confidence: Parent is swimlane
    if (block.parent && block.parent instanceof BlockProxy) {
        const parentClass = block.parent.getClassName();
        if (parentClass.includes('Swimlane')) {
            return {
                isLane: true,
                confidence: 'medium',
                detectionMethod: 'parentChildRelationship',
                laneName: extractLaneName(block),
                capacity: extractCapacity(block)
            };
        }
    }

    // Low confidence: Table structure
    if (block.parent && block.parent instanceof TableBlockProxy) {
        return {
            isLane: true,
            confidence: 'low',
            detectionMethod: 'tableStructure',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    return {
        isLane: false,
        confidence: 'high',
        detectionMethod: 'none'
    };
}

function extractLaneName(block: BlockProxy): string {
    const textAreaKeys = Array.from(block.textAreas.keys());
    if (textAreaKeys.length > 0) {
        const text = block.textAreas.get(textAreaKeys[0]) || '';
        // Remove capacity suffix if present: "Customer Service (3)" -> "Customer Service"
        return text.replace(/\s*\(\d+\)\s*$/, '').trim();
    }
    return `Lane ${block.id}`;
}

function extractCapacity(block: BlockProxy): number | undefined {
    const textAreaKeys = Array.from(block.textAreas.keys());
    if (textAreaKeys.length > 0) {
        const text = block.textAreas.get(textAreaKeys[0]) || '';
        // Look for capacity in parentheses: "Customer Service (3)" -> 3
        const match = text.match(/\((\d+)\)/);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    // Check properties for capacity
    const capacityProp = block.properties.get('capacity');
    if (typeof capacityProp === 'number') {
        return capacityProp;
    }

    return undefined; // Unknown capacity
}
```

## Extracting Lane Contents

Once a lane is detected, find activities within it:

```typescript
function getLaneContents(lane: BlockProxy, page: PageProxy): BlockProxy[] {
    const contents: BlockProxy[] = [];
    const laneBounds = lane.getBoundingBox();

    // Iterate all blocks on the page
    for (const [blockId, block] of page.allBlocks) {
        if (block.id === lane.id) continue; // Skip the lane itself

        const blockBounds = block.getBoundingBox();

        // Check if block is within lane boundaries
        if (isWithinBounds(blockBounds, laneBounds)) {
            contents.push(block);
        }
    }

    return contents;
}

function isWithinBounds(
    inner: { x: number; y: number; w: number; h: number },
    outer: { x: number; y: number; w: number; h: number }
): boolean {
    return inner.x >= outer.x &&
           inner.y >= outer.y &&
           (inner.x + inner.w) <= (outer.x + outer.w) &&
           (inner.y + inner.h) <= (outer.y + outer.h);
}
```

## Official Lucid SDK Documentation Links

### Core Documentation
- **Main Developer Portal:** https://developer.lucid.co/docs/
- **Extension API Overview:** https://developer.lucid.co/extension-api/
- **Attributes Syntax ($lanes):** https://developer.lucid.co/docs/attributes-syntax
- **lucid-extension-sdk Package:** https://developer.lucid.co/docs/lucid-extension-sdk
- **Blocks Documentation:** https://developer.lucid.co/docs/blocks

### API Reference
- **BlockProxy:** https://developer.lucid.co/extension-api/lucid-extension-sdk/BlockProxy.html *(may 404 - check main docs)*
- **TableBlockProxy:** https://developer.lucid.co/extension-api/lucid-extension-sdk/TableBlockProxy.html *(may 404 - check main docs)*
- **Custom Shapes:** https://developer.lucid.co/docs/custom-shape-libraries

### Tutorials and Guides
- **Getting Started:** https://developer.lucid.co/docs/welcome
- **Document Content:** https://developer.lucid.co/docs/document-content
- **Data Visualization:** https://developer.lucid.co/docs/data-visualization

### NPM Package
- **lucid-extension-sdk on npm:** https://www.npmjs.com/package/lucid-extension-sdk

## Local SDK Documentation

In this repository:

- **BlockProxy Reference:** `_docs/lucid_offline_sdk_docs/BlockProxy.md`
- **Blocks Guide:** `_docs/lucid_offline_sdk_docs/Blocks.md`
- **TableBlockProxy:** `_docs/lucid_offline_sdk_docs/TableBlockProxy.md`

## Testing Your Detection Code

### Console Inspection Template

```typescript
// Add this to your extension code to inspect a selected block
client.registerAction('inspect-block', () => {
    const viewport = new Viewport(client);
    const items = viewport.getSelectedItems();

    if (items.length === 1 && items[0] instanceof BlockProxy) {
        const block = items[0];

        console.log('=== Block Inspection ===');
        console.log('ID:', block.id);
        console.log('Class Name:', block.getClassName());
        console.log('Properties:', Array.from(block.properties.keys()));

        // Log all properties
        for (const [key, value] of block.properties) {
            console.log(`  ${key}:`, value);
        }

        // Log text areas
        console.log('Text Areas:');
        for (const [key, text] of block.textAreas) {
            console.log(`  ${key}: "${text}"`);
        }

        // Log parent
        if (block.parent) {
            console.log('Parent:', block.parent instanceof BlockProxy ? block.parent.getClassName() : 'Not a block');
        } else {
            console.log('Parent: None');
        }

        // Log bounding box
        console.log('Bounds:', block.getBoundingBox());

        console.log('=== End Inspection ===');
    }
});

// Add menu item to trigger inspection
menu.addDropdownMenuItem({
    label: 'Inspect Selected Block',
    action: 'inspect-block'
});
```

### Expected Output Examples

**For a swimlane lane:**
```
=== Block Inspection ===
ID: "block-12345"
Class Name: "SwimlaneLaneBlock" // or similar
Properties: ["lane", "laneIndex", "swimlaneId"]
  lane: true
  laneIndex: 0
  swimlaneId: "block-67890"
Text Areas:
  Label: "Customer Service (3)"
Parent: "SwimlaneLane"
Bounds: { x: 100, y: 200, w: 800, h: 150 }
=== End Inspection ===
```

**For a regular block:**
```
=== Block Inspection ===
ID: "block-99999"
Class Name: "ProcessBlock"
Properties: ["Link"]
  Link: ""
Text Areas:
  Text: "Handle Customer Call"
Parent: None
Bounds: { x: 250, y: 220, w: 120, h: 80 }
=== End Inspection ===
```

## Research Notes

This SDK reference is based on:

1. **Official Lucid Developer Documentation** (October 2024)
2. **Web search findings** about `$lanes` attribute
3. **Existing Quodsi codebase** patterns for block detection
4. **Local SDK documentation** files in this repository

**Key Unknown:** The exact implementation of swimlanes in LucidChart's SDK. Swimlanes might be:
- Custom block type with `$lanes` property
- Table structure with rows/columns as lanes
- Container blocks with nested lane blocks
- BPMN pool/lane implementation

**Recommendation:** Use the inspection template above to test with actual swimlanes and refine detection logic based on real data.

## Next Steps

- **[Detection Strategies](./03_detection_strategies.md):** Compare different approaches for lane detection
- **[Implementation Guide](./04_implementation_guide.md):** Build the lane detection service
- **[Testing Guide](./06_testing_guide.md):** Verify your implementation with real swimlanes

---

**Previous:** [Swimlane Overview](./01_swimlane_overview.md)

**Next:** [Detection Strategies](./03_detection_strategies.md)
