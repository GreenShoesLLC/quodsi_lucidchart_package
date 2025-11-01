# Implementation Guide: Lane-to-Resource Mapping

## Overview

This guide provides step-by-step instructions for implementing swimlane lane detection and automatic mapping to Quodsi Resource objects. We'll integrate with existing Quodsi architecture while following established patterns.

## Architecture Considerations

### Where Lane Detection Fits

```
┌─────────────────────────────────────────────────────┐
│ LucidChart Document                                 │
│  ┌────────────────┐                                │
│  │ Swimlane       │                                 │
│  │  ├─ Lane 1     │ ← Detect as Resource           │
│  │  ├─ Lane 2     │ ← Detect as Resource           │
│  │  └─ Lane 3     │ ← Detect as Resource           │
│  └────────────────┘                                 │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│ Extension Layer                                     │
│  ┌──────────────────────────────────────┐          │
│  │ LucidPageAnalyzer                    │          │
│  │  - Analyzes page structure           │          │
│  │  - Detects lanes                     │ ← Add here
│  │  - Assigns SimulationObjectType      │          │
│  └──────────────────────────────────────┘          │
│  ┌──────────────────────────────────────┐          │
│  │ SelectionHandler                     │          │
│  │  - Handles selection changes         │          │
│  │  - Identifies lane selections        │ ← Add here
│  │  - Routes to ResourceEditor          │          │
│  └──────────────────────────────────────┘          │
│  ┌──────────────────────────────────────┐          │
│  │ LaneDetectionService (NEW)           │          │
│  │  - Centralized lane detection logic  │ ← Create
│  │  - Reusable across components        │          │
│  └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│ Domain Model (Shared)                               │
│  ┌──────────────────────────────────────┐          │
│  │ Resource                             │          │
│  │  - name: string                      │          │
│  │  - capacity: number                  │          │
│  └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### Key Integration Points

1. **LucidPageAnalyzer** (`editorextensions/quodsi_editor_extension/src/services/conversion/LucidPageAnalyzer.ts`)
   - Add lane detection in `applyBlockSpecificLogic()`
   - Set `elementType = SimulationObjectType.Resource` for lanes

2. **SelectionHandler** (`editorextensions/quodsi_editor_extension/src/core/messaging/handlers/selection/SelectionHandler.ts`)
   - Identify when user selects a lane
   - Route to appropriate UI (Resource editor)

3. **LaneDetectionService** (NEW)
   - Centralized detection logic
   - Shared by analyzer and selection handler
   - Testable in isolation

4. **Resource Type** (`shared/src/types/elements/Resource.ts`)
   - Already exists, no changes needed
   - Has `name` and `capacity` properties

5. **ResourceLucid** (`editorextensions/quodsi_editor_extension/src/types/ResourceLucid.ts`)
   - LucidChart-specific Resource adapter
   - May need enhancements for lane-specific data

## Implementation Phases

### Phase 1: Create LaneDetectionService (Foundation)

**Goal:** Centralized, testable lane detection

**Files to create:**
- `editorextensions/quodsi_editor_extension/src/services/LaneDetectionService.ts`

**Implementation:**

```typescript
// File: editorextensions/quodsi_editor_extension/src/services/LaneDetectionService.ts

import { BlockProxy, PageProxy } from 'lucid-extension-sdk';
import { QuodsiLogger } from '@quodsi/shared';

export interface LaneDetectionResult {
    isLane: boolean;
    confidence: 'high' | 'medium' | 'low';
    method: string;
    laneName: string;
    capacity?: number;
}

export class LaneDetectionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LaneDetectionService]';

    constructor() {
        super();
        this.setLogging(true); // Enable for initial testing
    }

    /**
     * Detects if a block is a swimlane lane
     */
    public detectLane(
        block: BlockProxy,
        page?: PageProxy
    ): LaneDetectionResult {
        this.log('Detecting lane for block:', block.id);

        // Strategy 1: Class name
        if (this.isLaneByClassName(block)) {
            return this.createResult(block, 'high', 'className');
        }

        // Strategy 2: Properties
        if (this.isLaneByProperties(block)) {
            return this.createResult(block, 'high', 'properties');
        }

        // Strategy 3: Parent-child
        if (this.isLaneByParent(block)) {
            return this.createResult(block, 'medium', 'parentChild');
        }

        // Not a lane
        return {
            isLane: false,
            confidence: 'high',
            method: 'none',
            laneName: ''
        };
    }

    private isLaneByClassName(block: BlockProxy): boolean {
        const className = block.getClassName();
        const laneKeywords = ['Lane', 'Swimlane', 'Pool'];

        const isLane = laneKeywords.some(keyword =>
            className.includes(keyword)
        );

        this.log(`Class name check: ${className} → ${isLane}`);
        return isLane;
    }

    private isLaneByProperties(block: BlockProxy): boolean {
        const laneProps = ['lane', 'laneIndex', 'swimlane', '$lanes'];

        const hasLaneProp = laneProps.some(prop =>
            block.properties.has(prop)
        );

        this.log(`Property check → ${hasLaneProp}`);
        return hasLaneProp;
    }

    private isLaneByParent(block: BlockProxy): boolean {
        if (!block.parent || !(block.parent instanceof BlockProxy)) {
            return false;
        }

        const parentClass = block.parent.getClassName();
        const isLane = parentClass.includes('Swimlane');

        this.log(`Parent check: ${parentClass} → ${isLane}`);
        return isLane;
    }

    private createResult(
        block: BlockProxy,
        confidence: 'high' | 'medium' | 'low',
        method: string
    ): LaneDetectionResult {
        return {
            isLane: true,
            confidence,
            method,
            laneName: this.extractLaneName(block),
            capacity: this.extractCapacity(block)
        };
    }

    private extractLaneName(block: BlockProxy): string {
        const textAreaKeys = Array.from(block.textAreas.keys());
        if (textAreaKeys.length > 0) {
            const text = block.textAreas.get(textAreaKeys[0]) || '';
            // Remove capacity: "Sales (5)" → "Sales"
            return text.replace(/\s*\(\d+\)\s*$/, '').trim();
        }
        return `Lane ${block.id}`;
    }

    private extractCapacity(block: BlockProxy): number | undefined {
        // Check text for capacity in parentheses
        const textAreaKeys = Array.from(block.textAreas.keys());
        if (textAreaKeys.length > 0) {
            const text = block.textAreas.get(textAreaKeys[0]) || '';
            const match = text.match(/\((\d+)\)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }

        // Check properties
        const capacityProp = block.properties.get('capacity');
        if (typeof capacityProp === 'number') {
            return capacityProp;
        }

        return undefined; // Will default to 1 when creating Resource
    }
}
```

**Testing:**

Create a simple test:

```typescript
// File: editorextensions/quodsi_editor_extension/src/services/__tests__/LaneDetectionService.test.ts

import { LaneDetectionService } from '../LaneDetectionService';

describe('LaneDetectionService', () => {
    let service: LaneDetectionService;

    beforeEach(() => {
        service = new LaneDetectionService();
        service.setLogging(false);
    });

    test('detects lane by class name', () => {
        // Mock BlockProxy with lane class name
        const mockBlock = {
            id: 'block-1',
            getClassName: () => 'SwimlaneLane',
            properties: new Map(),
            textAreas: new Map([['Label', 'Customer Service (3)']]),
            parent: null
        };

        const result = service.detectLane(mockBlock as any);

        expect(result.isLane).toBe(true);
        expect(result.method).toBe('className');
        expect(result.laneName).toBe('Customer Service');
        expect(result.capacity).toBe(3);
    });

    // Add more tests...
});
```

### Phase 2: Integrate with LucidPageAnalyzer

**Goal:** Automatic lane detection during page conversion

**File to modify:**
- `editorextensions/quodsi_editor_extension/src/services/conversion/LucidPageAnalyzer.ts`

**Changes:**

```typescript
// Add import
import { LaneDetectionService } from '../LaneDetectionService';

export class LucidPageAnalyzer extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LucidPageAnalyzer]';
    private laneDetectionService: LaneDetectionService; // Add this

    constructor() {
        super();
        this.setLogging(false);
        this.laneDetectionService = new LaneDetectionService(); // Initialize
    }

    // ... existing code ...

    private applyBlockSpecificLogic(
        page: PageProxy,
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
        this.log('Applying block-specific logic');

        for (const [blockId, block] of page.allBlocks) {
            const analysis = blockAnalysis.get(blockId);
            if (!analysis) continue;

            const blockClass = block.getClassName();
            const previousType = analysis.elementType;

            // ADD: Lane detection
            const laneResult = this.laneDetectionService.detectLane(block, page);
            if (laneResult.isLane) {
                analysis.elementType = SimulationObjectType.Resource;
                this.log(`Block ${blockId} detected as swimlane lane`, {
                    method: laneResult.method,
                    confidence: laneResult.confidence,
                    laneName: laneResult.laneName,
                    capacity: laneResult.capacity
                });
                continue; // Skip other logic for lanes
            }

            // ... existing block-specific logic ...
        }
    }
}
```

**Result:** When users convert a page, lanes are automatically identified as Resources.

### Phase 3: Integrate with SelectionHandler

**Goal:** Detect lane selections and show Resource editor

**File to modify:**
- `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/selection/SelectionHandler.ts`

**Changes:**

```typescript
// Add import
import { LaneDetectionService } from '../../../../services/LaneDetectionService';

export class SelectionHandler {
    private laneDetectionService: LaneDetectionService;

    constructor(
        private client: EditorClient,
        private modelManager: ModelManager,
        private messageRouter: MessageRouter
    ) {
        this.laneDetectionService = new LaneDetectionService();
    }

    // ... existing code ...

    private async processSelection(items: ItemProxy[]): Promise<void> {
        // ... existing selection processing ...

        // ADD: Check for lane selection
        if (items.length === 1 && items[0] instanceof BlockProxy) {
            const block = items[0];
            const laneResult = this.laneDetectionService.detectLane(block);

            if (laneResult.isLane) {
                console.log('[SelectionHandler] Lane selected:', laneResult);

                // Check if already converted to Resource
                const metadata = await this.modelManager.getMetadata(block);

                if (!metadata || metadata.type === SimulationObjectType.None) {
                    // Unconverted lane - show conversion UI
                    this.sendUnconvertedLaneMessage(block, laneResult);
                } else if (metadata.type === SimulationObjectType.Resource) {
                    // Already a Resource - show Resource editor
                    this.sendResourceSelectionMessage(block);
                } else {
                    // Lane converted to something else (unusual)
                    console.warn('[SelectionHandler] Lane converted to non-Resource type');
                }

                return; // Lane handled
            }
        }

        // ... existing selection logic ...
    }

    private sendUnconvertedLaneMessage(
        block: BlockProxy,
        laneResult: LaneDetectionResult
    ): void {
        // Send message to React to show lane conversion UI
        this.messageRouter.sendMessage({
            type: 'LANE_DETECTED',
            data: {
                blockId: block.id,
                laneName: laneResult.laneName,
                capacity: laneResult.capacity,
                confidence: laneResult.confidence
            }
        });
    }

    private sendResourceSelectionMessage(block: BlockProxy): void {
        // Send normal Resource selection message
        // (existing Resource selection logic)
    }
}
```

### Phase 4: UI Integration (React)

**Goal:** Show lane-specific UI in React app

**Files to modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/QuodsiApp.tsx`
- Create new component: `LaneConversionPrompt.tsx`

**Message Handler:**

```typescript
// In QuodsiApp.tsx

// Add message handler
const handleLaneDetected = useCallback((message: any) => {
    const { blockId, laneName, capacity, confidence } = message.data;

    console.log('[QuodsiApp] Lane detected:', laneName);

    // Show lane conversion prompt
    setShowLaneConversionPrompt(true);
    setLaneConversionData({
        blockId,
        laneName,
        suggestedCapacity: capacity || 1,
        confidence
    });
}, []);

// Register handler
useEffect(() => {
    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'LANE_DETECTED') {
            handleLaneDetected(message);
        }
        // ... existing handlers ...
    });
}, [handleLaneDetected]);
```

**Conversion Component:**

```typescript
// File: LaneConversionPrompt.tsx

interface LaneConversionPromptProps {
    laneName: string;
    suggestedCapacity: number;
    blockId: string;
    onConvert: (capacity: number) => void;
    onCancel: () => void;
}

export const LaneConversionPrompt: React.FC<LaneConversionPromptProps> = ({
    laneName,
    suggestedCapacity,
    blockId,
    onConvert,
    onCancel
}) => {
    const [capacity, setCapacity] = useState(suggestedCapacity);

    return (
        <div className="lane-conversion-prompt">
            <h3>Convert Lane to Resource</h3>
            <p>Lane detected: <strong>{laneName}</strong></p>

            <label>
                Resource Capacity:
                <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value))}
                />
            </label>

            <div className="actions">
                <button onClick={() => onConvert(capacity)}>
                    Convert to Resource
                </button>
                <button onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
};
```

### Phase 5: Automatic Resource Requirement Generation

**Goal:** Activities in lanes automatically require that lane's Resource

**File to modify:**
- `editorextensions/quodsi_editor_extension/src/services/conversion/PageSchemaConversionService.ts`

**Logic:**

```typescript
// When converting an Activity that's within a lane

private async convertActivity(
    block: BlockProxy,
    page: PageProxy
): Promise<Activity> {
    const activity = /* ... create activity ... */;

    // Check if activity is within a lane
    const containingLane = this.findContainingLane(block, page);

    if (containingLane) {
        // Get the Resource ID for this lane
        const laneResourceId = await this.getLaneResourceId(containingLane);

        if (laneResourceId) {
            // Auto-create resource requirement
            const requirement = this.createResourceRequirement(
                laneResourceId,
                1 // quantity
            );

            // Add to activity's operation steps
            activity.operationSteps.forEach(step => {
                step.requirementId = requirement.id;
            });

            this.log(`Auto-assigned Resource ${laneResourceId} to Activity ${activity.id}`);
        }
    }

    return activity;
}

private findContainingLane(
    block: BlockProxy,
    page: PageProxy
): BlockProxy | null {
    const blockBounds = block.getBoundingBox();

    for (const [laneId, potentialLane] of page.allBlocks) {
        const laneResult = this.laneDetectionService.detectLane(potentialLane);

        if (!laneResult.isLane) continue;

        const laneBounds = potentialLane.getBoundingBox();

        // Check if block is within lane
        if (this.isWithinBounds(blockBounds, laneBounds)) {
            return potentialLane;
        }
    }

    return null;
}

private isWithinBounds(
    inner: BoundingBox,
    outer: BoundingBox
): boolean {
    return inner.x >= outer.x &&
           inner.y >= outer.y &&
           (inner.x + inner.w) <= (outer.x + outer.w) &&
           (inner.y + inner.h) <= (outer.y + outer.h);
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `LaneDetectionService.ts`
- [ ] Implement basic detection strategies (className, properties)
- [ ] Add logging for debugging
- [ ] Write unit tests
- [ ] Test with actual swimlanes

### Phase 2: Page Conversion
- [ ] Add `LaneDetectionService` to `LucidPageAnalyzer`
- [ ] Integrate detection in `applyBlockSpecificLogic()`
- [ ] Test page conversion with lanes
- [ ] Verify lanes become Resources

### Phase 3: Selection Handling
- [ ] Add `LaneDetectionService` to `SelectionHandler`
- [ ] Detect lane selections
- [ ] Route to appropriate UI
- [ ] Test selection behavior

### Phase 4: UI
- [ ] Add `LANE_DETECTED` message handler
- [ ] Create `LaneConversionPrompt` component
- [ ] Implement conversion flow
- [ ] Style UI components
- [ ] Test user workflow

### Phase 5: Automatic Requirements
- [ ] Implement lane containment detection
- [ ] Auto-generate ResourceRequirements
- [ ] Update conversion service
- [ ] Test end-to-end workflow
- [ ] Validate simulation results

## Data Storage Strategy

### Lane Metadata Storage

Store lane-specific metadata in the block's shape data:

```typescript
// When converting lane to Resource
await this.storageAdapter.storeCustomData(laneBlock, {
    isLane: true,
    laneOrientation: 'horizontal' | 'vertical',
    laneIndex: 2,
    swimlaneId: 'parent-swimlane-id'
});

// Retrieve later
const metadata = await this.storageAdapter.getCustomData(laneBlock);
if (metadata.isLane) {
    // Handle as lane
}
```

### Resource-Lane Association

Store bi-directional mapping:

```typescript
// Resource knows it came from a lane
Resource {
    id: 'resource-1',
    name: 'Customer Service',
    capacity: 3,
    sourceType: 'swimlane-lane', // NEW
    sourceLaneId: 'block-12345'  // NEW
}

// Lane block knows its Resource
LaneBlock.properties.set('quodsi_resource_id', 'resource-1');
```

## Error Handling

### Lane Detection Failures

```typescript
try {
    const laneResult = this.laneDetectionService.detectLane(block);

    if (laneResult.confidence === 'low') {
        // Warn user
        console.warn('[LaneDetection] Low confidence detection');
        // Optionally prompt for confirmation
    }
} catch (error) {
    console.error('[LaneDetection] Detection failed:', error);
    // Fall back to treating as normal block
}
```

### Missing Capacity

```typescript
const capacity = laneResult.capacity || 1; // Default to 1

if (!laneResult.capacity) {
    console.warn('[LaneDetection] Capacity not specified, defaulting to 1');
    // Optionally prompt user for capacity
}
```

## Testing Strategy

### Unit Tests

Test `LaneDetectionService` in isolation with mocked `BlockProxy` objects.

### Integration Tests

Test with actual LucidChart extension:

1. Create test document with swimlanes
2. Select lanes
3. Verify detection logs
4. Convert lanes to Resources
5. Verify Resource properties

### End-to-End Tests

1. Create swimlane with 3 lanes
2. Add activities to each lane
3. Convert page to model
4. Verify Resources created
5. Verify Activities have correct ResourceRequirements
6. Run simulation
7. Verify resource utilization results

## Performance Considerations

### Caching Detection Results

```typescript
private detectionCache = new Map<string, LaneDetectionResult>();

public detectLane(block: BlockProxy): LaneDetectionResult {
    // Check cache first
    const cached = this.detectionCache.get(block.id);
    if (cached) {
        return cached;
    }

    // Perform detection
    const result = this.performDetection(block);

    // Cache result
    this.detectionCache.set(block.id, result);

    return result;
}

public clearCache(): void {
    this.detectionCache.clear();
}
```

### Batch Processing

When converting a page, detect all lanes in one pass:

```typescript
public detectAllLanes(page: PageProxy): Map<string, LaneDetectionResult> {
    const results = new Map<string, LaneDetectionResult>();

    for (const [blockId, block] of page.allBlocks) {
        const result = this.detectLane(block, page);
        if (result.isLane) {
            results.set(blockId, result);
        }
    }

    return results;
}
```

## Migration Path

### Existing Documents

For users with existing swimlane diagrams:

1. **Detect lanes on first open**
   - Scan document for lanes
   - Prompt user to convert

2. **Batch conversion**
   - "Convert all lanes to Resources" button
   - Show preview before conversion

3. **Preserve existing data**
   - Don't overwrite manually created Resources
   - Merge if lane and Resource have same name

## Next Steps

- **[Code Examples](./05_code_examples.md):** Complete working implementations
- **[Testing Guide](./06_testing_guide.md):** Validate your implementation

---

**Previous:** [Detection Strategies](./03_detection_strategies.md)

**Next:** [Code Examples](./05_code_examples.md)
