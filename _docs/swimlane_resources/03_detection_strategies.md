# Lane Detection Strategies

## Overview

This document compares different strategies for programmatically detecting if a selected BlockProxy is a swimlane lane. Each strategy has trade-offs in terms of reliability, complexity, and compatibility.

## Strategy Comparison Table

| Strategy | Reliability | Complexity | Dependencies | Best For |
|----------|-------------|------------|--------------|----------|
| **Class Name** | High | Low | None | First attempt, broad compatibility |
| **Properties** | Medium-High | Medium | Knowledge of property names | Confirming class name results |
| **Parent-Child** | Medium | Medium | Understanding of containment | Nested lane structures |
| **$lanes Access** | High | High | Understanding formula system | Getting all lanes from swimlane |
| **Bounding Box** | Low | High | Geometric calculations | Fallback when others fail |

## Strategy 1: Class Name Inspection

### Concept

Use `block.getClassName()` to check if the class name contains keywords like "Swimlane", "Lane", or "Pool".

### Implementation

```typescript
function isSwimlaneLane_ClassName(block: BlockProxy): boolean {
    const className = block.getClassName();

    // Check for common swimlane-related class names
    const laneKeywords = ['Lane', 'Swimlane', 'Pool', 'Swim'];

    return laneKeywords.some(keyword =>
        className.includes(keyword)
    );
}
```

### Advantages

- **Simple:** Single method call, easy to understand
- **Fast:** No iteration or complex logic
- **Reliable:** Class names are stable identifiers
- **No dependencies:** Works with basic BlockProxy API

### Disadvantages

- **Requires knowledge:** Need to know possible class name patterns
- **False positives:** Non-lane blocks with similar names
- **Incomplete:** Might miss custom swimlane implementations

### When to Use

- **First line of defense:** Start with this strategy
- **Quick filtering:** Eliminate obviously non-lane blocks
- **Known environments:** When you know the swimlane types used

### Testing Requirements

1. Create various swimlanes in LucidChart
2. Select lanes and log class names
3. Build a list of observed class names
4. Update detection logic with findings

### Example Test Results

```typescript
// Example class names observed (needs actual testing):
// - "SwimlaneLane"
// - "HorizontalSwimlaneLane"
// - "VerticalSwimlaneLane"
// - "BPMNLane"
// - "TableRowLane" (if using table structure)
```

## Strategy 2: Property-Based Detection

### Concept

Check `block.properties` for lane-specific properties like `lane`, `laneIndex`, `swimlane`, or `$lanes`.

### Implementation

```typescript
function isSwimlaneLane_Properties(block: BlockProxy): boolean {
    // List of property names that indicate a lane
    const lanePropertyNames = [
        'lane',
        'laneIndex',
        'laneId',
        'swimlane',
        'swimlaneId',
        '$lanes',
        'isLane'
    ];

    // Check if any lane property exists
    return lanePropertyNames.some(propName =>
        block.properties.has(propName)
    );
}

function getLaneMetadata(block: BlockProxy): LaneMetadata | null {
    if (!isSwimlaneLane_Properties(block)) {
        return null;
    }

    return {
        laneIndex: block.properties.get('laneIndex') as number | undefined,
        swimlaneId: block.properties.get('swimlaneId') as string | undefined,
        isLane: block.properties.get('isLane') as boolean | undefined
    };
}

interface LaneMetadata {
    laneIndex?: number;
    swimlaneId?: string;
    isLane?: boolean;
}
```

### Advantages

- **Detailed information:** Properties can provide lane index, parent swimlane ID, etc.
- **Flexible:** Can adapt to different property naming conventions
- **Complementary:** Works well combined with class name strategy

### Disadvantages

- **Requires testing:** Property names must be discovered through inspection
- **Inconsistent:** Different swimlane types might use different properties
- **Potentially verbose:** Need to check multiple property names

### When to Use

- **Confirmation:** After class name detection succeeds
- **Metadata extraction:** To get additional lane information
- **Custom swimlanes:** When standard class names don't apply

### Testing Requirements

1. Select lanes and log all property keys
2. Identify common patterns
3. Update property name list
4. Test with different swimlane orientations

### Example Property Inspection

```typescript
// Inspection code
for (const [key, value] of block.properties) {
    console.log(`${key}: ${value}`);
}

// Expected output for a lane (hypothetical):
// lane: true
// laneIndex: 2
// swimlaneId: "block-12345"
// orientation: "horizontal"
```

## Strategy 3: Parent-Child Relationship

### Concept

Check if the block's parent is a swimlane. If so, the block is likely a lane.

### Implementation

```typescript
function isSwimlaneLane_ParentChild(block: BlockProxy): boolean {
    // Check if block has a parent
    if (!block.parent || !(block.parent instanceof BlockProxy)) {
        return false;
    }

    const parent = block.parent;
    const parentClass = parent.getClassName();

    // Check if parent is a swimlane
    const swimlaneKeywords = ['Swimlane', 'Pool', 'Swim'];

    return swimlaneKeywords.some(keyword =>
        parentClass.includes(keyword)
    );
}

function getParentSwimlane(block: BlockProxy): BlockProxy | null {
    if (!block.parent || !(block.parent instanceof BlockProxy)) {
        return null;
    }

    const parent = block.parent;
    const parentClass = parent.getClassName();

    if (parentClass.includes('Swimlane')) {
        return parent;
    }

    return null;
}
```

### Advantages

- **Structural understanding:** Respects document hierarchy
- **Reliable:** Parent-child relationships are explicit
- **Additional context:** Can access parent swimlane properties

### Disadvantages

- **Assumes hierarchy:** Lanes must be children of swimlanes (might not always be true)
- **Indirect:** Relies on parent identification being correct
- **Limited:** Doesn't work for top-level swimlanes without parents

### When to Use

- **Hierarchical diagrams:** When swimlanes contain lanes as children
- **Nested structures:** For complex multi-level swimlanes
- **Validation:** Confirm lane belongs to a swimlane

### Testing Requirements

1. Inspect parent property of suspected lanes
2. Verify parent class names
3. Test with nested swimlanes
4. Check edge cases (top-level lanes, orphaned lanes)

## Strategy 4: `$lanes` Attribute Access

### Concept

Access the swimlane's `$lanes` attribute to get all lanes, then check if the selected block is in that list.

### Implementation

```typescript
function getAllLanes(swimlane: BlockProxy): BlockProxy[] {
    const lanes: BlockProxy[] = [];

    // Attempt to access $lanes property
    const $lanes = swimlane.properties.get('$lanes');

    if ($lanes && Array.isArray($lanes)) {
        // If $lanes contains block references
        for (const lane of $lanes) {
            if (lane instanceof BlockProxy) {
                lanes.push(lane);
            }
        }
    }

    return lanes;
}

function isSwimlaneLane_$lanes(
    block: BlockProxy,
    page: PageProxy
): boolean {
    // Find all swimlanes on the page
    for (const [swimlaneId, potentialSwimlane] of page.allBlocks) {
        const className = potentialSwimlane.getClassName();

        if (!className.includes('Swimlane')) {
            continue; // Not a swimlane
        }

        // Get lanes from this swimlane
        const lanes = getAllLanes(potentialSwimlane);

        // Check if our block is in the lanes
        if (lanes.some(lane => lane.id === block.id)) {
            return true;
        }
    }

    return false;
}
```

### Advantages

- **Authoritative:** Uses official Lucid attribute
- **Complete:** Gets all lanes, no guessing
- **Structured:** Provides direct access to lane list

### Disadvantages

- **Unknown access method:** Exact API for accessing `$lanes` unclear
- **Performance:** Requires iterating all blocks to find swimlanes
- **Complexity:** More code required
- **Testing needed:** Must verify `$lanes` is accessible this way

### When to Use

- **Comprehensive detection:** When you need to find all lanes
- **Batch operations:** Converting all lanes in a swimlane
- **Validation:** Verify other detection methods

### Testing Requirements

1. Test if `$lanes` is accessible via properties
2. Verify the structure of returned data
3. Confirm lane references are BlockProxy instances
4. Document actual API access pattern

## Strategy 5: Bounding Box Analysis (Fallback)

### Concept

Use geometric analysis to determine if a block is positioned like a lane within a swimlane.

### Implementation

```typescript
function isSwimlaneLane_BoundingBox(
    block: BlockProxy,
    page: PageProxy
): boolean {
    const blockBounds = block.getBoundingBox();

    // Find potential parent swimlanes by checking containment
    for (const [swimlaneId, potentialSwimlane] of page.allBlocks) {
        if (potentialSwimlane.id === block.id) {
            continue; // Skip self
        }

        const swimlaneBounds = potentialSwimlane.getBoundingBox();

        // Check if block is roughly aligned and contained
        if (isLikelyLaneWithinSwimlane(blockBounds, swimlaneBounds)) {
            return true;
        }
    }

    return false;
}

function isLikelyLaneWithinSwimlane(
    laneBounds: BoundingBox,
    swimlaneBounds: BoundingBox
): boolean {
    // Lane should be within swimlane
    if (!isWithinBounds(laneBounds, swimlaneBounds)) {
        return false;
    }

    // Lane should span most of swimlane width/height
    const widthRatio = laneBounds.w / swimlaneBounds.w;
    const heightRatio = laneBounds.h / swimlaneBounds.h;

    // Horizontal lane: spans width, partial height
    const isHorizontalLane = widthRatio > 0.9 && heightRatio < 0.5;

    // Vertical lane: spans height, partial width
    const isVerticalLane = heightRatio > 0.9 && widthRatio < 0.5;

    return isHorizontalLane || isVerticalLane;
}

type BoundingBox = { x: number; y: number; w: number; h: number };

function isWithinBounds(inner: BoundingBox, outer: BoundingBox): boolean {
    return inner.x >= outer.x &&
           inner.y >= outer.y &&
           (inner.x + inner.w) <= (outer.x + outer.w) &&
           (inner.y + inner.h) <= (outer.y + outer.h);
}
```

### Advantages

- **No assumptions:** Works without knowing class names or properties
- **Universal:** Works with any swimlane implementation
- **Fallback:** Useful when other strategies fail

### Disadvantages

- **Unreliable:** Geometric heuristics can produce false positives
- **Complex:** Lots of calculations and magic numbers
- **Slow:** Requires checking all blocks on page
- **Fragile:** Breaks if swimlane layout changes

### When to Use

- **Last resort:** Only when other strategies fail
- **Unknown swimlane types:** Custom or non-standard swimlanes
- **Debugging:** Understand spatial relationships

### Testing Requirements

1. Measure actual lane dimensions relative to swimlanes
2. Tune width/height ratio thresholds
3. Test with various swimlane sizes
4. Validate with nested structures

## Recommended Combined Strategy

### Multi-Level Detection

Use strategies in sequence, from most reliable to least:

```typescript
interface LaneDetectionResult {
    isLane: boolean;
    confidence: 'high' | 'medium' | 'low';
    method: string;
    laneName: string;
    capacity?: number;
}

function detectLane(
    block: BlockProxy,
    page: PageProxy
): LaneDetectionResult {
    // Strategy 1: Class name (high confidence)
    if (isSwimlaneLane_ClassName(block)) {
        return {
            isLane: true,
            confidence: 'high',
            method: 'className',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Strategy 2: Properties (high confidence)
    if (isSwimlaneLane_Properties(block)) {
        return {
            isLane: true,
            confidence: 'high',
            method: 'properties',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Strategy 3: Parent-child (medium confidence)
    if (isSwimlaneLane_ParentChild(block)) {
        return {
            isLane: true,
            confidence: 'medium',
            method: 'parentChild',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Strategy 4: $lanes (medium confidence, requires page iteration)
    if (isSwimlaneLane_$lanes(block, page)) {
        return {
            isLane: true,
            confidence: 'medium',
            method: '$lanes',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Strategy 5: Bounding box (low confidence, fallback)
    if (isSwimlaneLane_BoundingBox(block, page)) {
        return {
            isLane: true,
            confidence: 'low',
            method: 'boundingBox',
            laneName: extractLaneName(block),
            capacity: extractCapacity(block)
        };
    }

    // Not a lane
    return {
        isLane: false,
        confidence: 'high',
        method: 'none',
        laneName: ''
    };
}
```

### Extract Supporting Data

```typescript
function extractLaneName(block: BlockProxy): string {
    const textAreaKeys = Array.from(block.textAreas.keys());
    if (textAreaKeys.length > 0) {
        const text = block.textAreas.get(textAreaKeys[0]) || '';
        // Remove capacity notation: "Sales (5)" -> "Sales"
        return text.replace(/\s*\(\d+\)\s*$/, '').trim();
    }
    return `Lane ${block.id}`;
}

function extractCapacity(block: BlockProxy): number | undefined {
    const textAreaKeys = Array.from(block.textAreas.keys());
    if (textAreaKeys.length > 0) {
        const text = block.textAreas.get(textAreaKeys[0]) || '';
        // Extract capacity from parentheses: "Sales (5)" -> 5
        const match = text.match(/\((\d+)\)/);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    // Check properties
    const capacity = block.properties.get('capacity');
    if (typeof capacity === 'number') {
        return capacity;
    }

    return undefined; // Unknown capacity, default to 1 later
}
```

## Decision Tree

```
Is BlockProxy a swimlane lane?
│
├─ Check class name contains "Lane" or "Swimlane"
│  └─ YES → High confidence: LANE ✓
│  └─ NO → Continue...
│
├─ Check properties for lane-related keys
│  └─ YES → High confidence: LANE ✓
│  └─ NO → Continue...
│
├─ Check if parent is a swimlane
│  └─ YES → Medium confidence: LANE ✓
│  └─ NO → Continue...
│
├─ Check if block in swimlane's $lanes
│  └─ YES → Medium confidence: LANE ✓
│  └─ NO → Continue...
│
├─ Check bounding box alignment
│  └─ YES → Low confidence: LANE ?
│  └─ NO → NOT A LANE ✗
```

## Implementation Recommendations for Quodsi

### Phase 1: Basic Detection (MVP)

Implement **Class Name** and **Properties** strategies:

**Pros:**
- Simple to implement
- Low complexity
- Fast execution
- Covers most common cases

**Cons:**
- Might miss edge cases
- Requires testing to find class names

### Phase 2: Enhanced Detection

Add **Parent-Child** strategy:

**Pros:**
- Better coverage
- Handles nested structures
- More reliable

### Phase 3: Comprehensive Detection (Optional)

Add **$lanes** and **Bounding Box** strategies for complete coverage.

### Integration with Existing Quodsi Code

Follow the pattern in `LucidPageAnalyzer.ts`:

```typescript
// In LucidPageAnalyzer.ts
private applyBlockSpecificLogic(
    page: PageProxy,
    blockAnalysis: Map<string, BlockAnalysis>
): void {
    for (const [blockId, block] of page.allBlocks) {
        const analysis = blockAnalysis.get(blockId);
        if (!analysis) continue;

        const blockClass = block.getClassName();

        // Add lane detection
        if (this.isSwimlaneLane(block)) {
            analysis.elementType = SimulationObjectType.Resource;
            this.log(`Block ${blockId} identified as swimlane lane (Resource)`);
        }

        // ... existing logic ...
    }
}

private isSwimlaneLane(block: BlockProxy): boolean {
    // Use recommended combined strategy
    return detectLane(block).isLane;
}
```

## Testing Strategy

### Test Cases

1. **Horizontal swimlane with 3 lanes**
   - Verify all 3 lanes detected
   - Check lane names extracted correctly
   - Validate capacity parsing

2. **Vertical swimlane with 2 lanes**
   - Ensure orientation doesn't affect detection
   - Verify layout differences handled

3. **BPMN diagram with pools and lanes**
   - Test BPMN-specific class names
   - Validate hierarchical lane structure

4. **Table-based swimlane**
   - If tables used, ensure detection works
   - Test row vs column lanes

5. **Custom swimlane**
   - User-created custom swimlane shape
   - Verify fallback strategies work

6. **Non-lane blocks**
   - Regular process blocks
   - Ensure no false positives

### Testing Workflow

1. Create test diagram in LucidChart
2. Add inspection menu item (see [SDK Reference](./02_sdk_reference.md))
3. Select each lane and log properties
4. Refine detection logic based on findings
5. Update documentation with actual class names and properties

## Next Steps

- **[Implementation Guide](./04_implementation_guide.md):** Step-by-step implementation with Quodsi integration
- **[Code Examples](./05_code_examples.md):** Complete working code
- **[Testing Guide](./06_testing_guide.md):** Validate your detection logic

---

**Previous:** [SDK Reference](./02_sdk_reference.md)

**Next:** [Implementation Guide](./04_implementation_guide.md)
