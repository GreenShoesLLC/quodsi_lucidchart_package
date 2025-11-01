# Code Examples: Lane Detection and Resource Mapping

## Overview

This document provides complete, production-ready code examples for implementing swimlane lane detection and mapping to Quodsi Resources. All code follows Quodsi's established patterns and can be copied directly into your implementation.

## Table of Contents

1. [LaneDetectionService (Complete Implementation)](#1-lanedetectionservice-complete-implementation)
2. [Integration with LucidPageAnalyzer](#2-integration-with-lucidpageanalyzer)
3. [Integration with SelectionHandler](#3-integration-with-selectionhandler)
4. [React UI Components](#4-react-ui-components)
5. [Automatic Resource Requirement Generation](#5-automatic-resource-requirement-generation)
6. [Testing Utilities](#6-testing-utilities)
7. [Debugging Tools](#7-debugging-tools)

---

## 1. LaneDetectionService (Complete Implementation)

**File:** `editorextensions/quodsi_editor_extension/src/services/LaneDetectionService.ts`

```typescript
import { BlockProxy, PageProxy } from 'lucid-extension-sdk';
import { QuodsiLogger } from '@quodsi/shared';

/**
 * Result of lane detection
 */
export interface LaneDetectionResult {
    /** Whether the block is a swimlane lane */
    isLane: boolean;

    /** Confidence level of detection */
    confidence: 'high' | 'medium' | 'low';

    /** Detection method used */
    method: 'className' | 'properties' | 'parentChild' | '$lanes' | 'none';

    /** Extracted lane name */
    laneName: string;

    /** Extracted capacity (undefined if not found) */
    capacity?: number;

    /** Lane orientation if detectable */
    orientation?: 'horizontal' | 'vertical';

    /** Index of lane within swimlane if detectable */
    laneIndex?: number;

    /** Parent swimlane ID if detectable */
    swimlaneId?: string;
}

/**
 * Service for detecting swimlane lanes and extracting their metadata
 */
export class LaneDetectionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LaneDetectionService]';

    private readonly LANE_CLASS_KEYWORDS = [
        'Lane',
        'Swimlane',
        'Swim',
        'Pool', // BPMN pools
        'BPMNLane'
    ];

    private readonly LANE_PROPERTY_NAMES = [
        'lane',
        'laneIndex',
        'laneId',
        'swimlane',
        'swimlaneId',
        '$lanes',
        'isLane',
        'poolId' // BPMN
    ];

    constructor(enableLogging: boolean = false) {
        super();
        this.setLogging(enableLogging);
    }

    /**
     * Detects if a block is a swimlane lane
     * @param block The block to check
     * @param page Optional page context for advanced detection
     * @returns Detection result with metadata
     */
    public detectLane(
        block: BlockProxy,
        page?: PageProxy
    ): LaneDetectionResult {
        this.log(`Detecting lane for block: ${block.id}`);

        // Strategy 1: Class name (high confidence)
        if (this.isLaneByClassName(block)) {
            this.log('  ✓ Detected by class name');
            return this.createResult(block, 'high', 'className');
        }

        // Strategy 2: Properties (high confidence)
        if (this.isLaneByProperties(block)) {
            this.log('  ✓ Detected by properties');
            return this.createResult(block, 'high', 'properties');
        }

        // Strategy 3: Parent-child (medium confidence)
        if (this.isLaneByParent(block)) {
            this.log('  ✓ Detected by parent relationship');
            return this.createResult(block, 'medium', 'parentChild');
        }

        // Strategy 4: $lanes attribute (medium confidence, requires page)
        if (page && this.isLaneBy$lanes(block, page)) {
            this.log('  ✓ Detected via $lanes attribute');
            return this.createResult(block, 'medium', '$lanes');
        }

        this.log('  ✗ Not a lane');

        return {
            isLane: false,
            confidence: 'high',
            method: 'none',
            laneName: ''
        };
    }

    /**
     * Detect all lanes on a page (batch operation)
     * @param page The page to scan
     * @returns Map of block ID to detection result
     */
    public detectAllLanes(page: PageProxy): Map<string, LaneDetectionResult> {
        this.log('Detecting all lanes on page');

        const results = new Map<string, LaneDetectionResult>();

        for (const [blockId, block] of page.allBlocks) {
            const result = this.detectLane(block, page);

            if (result.isLane) {
                results.set(blockId, result);
                this.log(`  Lane found: ${blockId} - ${result.laneName}`);
            }
        }

        this.log(`Total lanes found: ${results.size}`);
        return results;
    }

    /**
     * Find all activities within a lane
     * @param lane The lane block
     * @param page The page containing the activities
     * @returns Array of blocks within the lane
     */
    public getActivitiesInLane(
        lane: BlockProxy,
        page: PageProxy
    ): BlockProxy[] {
        const activities: BlockProxy[] = [];
        const laneBounds = lane.getBoundingBox();

        for (const [blockId, block] of page.allBlocks) {
            if (block.id === lane.id) continue; // Skip the lane itself

            // Skip if it's another lane
            if (this.detectLane(block, page).isLane) continue;

            const blockBounds = block.getBoundingBox();

            // Check if block is within lane boundaries
            if (this.isWithinBounds(blockBounds, laneBounds)) {
                activities.push(block);
            }
        }

        this.log(`Found ${activities.length} activities in lane ${lane.id}`);
        return activities;
    }

    // ==================== Detection Strategies ====================

    private isLaneByClassName(block: BlockProxy): boolean {
        const className = block.getClassName();

        return this.LANE_CLASS_KEYWORDS.some(keyword =>
            className.includes(keyword)
        );
    }

    private isLaneByProperties(block: BlockProxy): boolean {
        return this.LANE_PROPERTY_NAMES.some(propName =>
            block.properties.has(propName)
        );
    }

    private isLaneByParent(block: BlockProxy): boolean {
        if (!block.parent || !(block.parent instanceof BlockProxy)) {
            return false;
        }

        const parentClass = block.parent.getClassName();

        return this.LANE_CLASS_KEYWORDS.some(keyword =>
            parentClass.includes(keyword)
        );
    }

    private isLaneBy$lanes(block: BlockProxy, page: PageProxy): boolean {
        // Find all potential swimlanes on the page
        for (const [_, potentialSwimlane] of page.allBlocks) {
            const className = potentialSwimlane.getClassName();

            if (!this.LANE_CLASS_KEYWORDS.some(kw => className.includes(kw))) {
                continue; // Not a swimlane
            }

            // Try to get $lanes property
            const $lanes = potentialSwimlane.properties.get('$lanes');

            if ($lanes && Array.isArray($lanes)) {
                // Check if our block is in this swimlane's lanes
                const laneIds = $lanes.map((lane: any) =>
                    typeof lane === 'string' ? lane : lane.id
                );

                if (laneIds.includes(block.id)) {
                    return true;
                }
            }
        }

        return false;
    }

    // ==================== Metadata Extraction ====================

    private createResult(
        block: BlockProxy,
        confidence: 'high' | 'medium' | 'low',
        method: LaneDetectionResult['method']
    ): LaneDetectionResult {
        return {
            isLane: true,
            confidence,
            method,
            laneName: this.extractLaneName(block),
            capacity: this.extractCapacity(block),
            orientation: this.extractOrientation(block),
            laneIndex: this.extractLaneIndex(block),
            swimlaneId: this.extractSwimlaneId(block)
        };
    }

    private extractLaneName(block: BlockProxy): string {
        // Try text areas first
        const textAreaKeys = Array.from(block.textAreas.keys());

        if (textAreaKeys.length > 0) {
            const text = block.textAreas.get(textAreaKeys[0]) || '';

            // Remove capacity suffix: "Sales (5)" → "Sales"
            const cleanedText = text.replace(/\s*\(\d+\)\s*$/, '').trim();

            if (cleanedText) {
                return cleanedText;
            }
        }

        // Try properties
        const nameProp = block.properties.get('name') ||
                        block.properties.get('laneName');

        if (typeof nameProp === 'string' && nameProp) {
            return nameProp;
        }

        // Default
        return `Lane ${block.id.substring(0, 8)}`;
    }

    private extractCapacity(block: BlockProxy): number | undefined {
        // Try text area first: "Sales (5)" → 5
        const textAreaKeys = Array.from(block.textAreas.keys());

        if (textAreaKeys.length > 0) {
            const text = block.textAreas.get(textAreaKeys[0]) || '';
            const match = text.match(/\((\d+)\)/);

            if (match) {
                return parseInt(match[1], 10);
            }
        }

        // Try properties
        const capacityProp = block.properties.get('capacity');

        if (typeof capacityProp === 'number') {
            return capacityProp;
        }

        // Not specified
        return undefined;
    }

    private extractOrientation(block: BlockProxy): 'horizontal' | 'vertical' | undefined {
        // Try property
        const orientationProp = block.properties.get('orientation') ||
                               block.properties.get('direction');

        if (orientationProp === 'horizontal' || orientationProp === 'h') {
            return 'horizontal';
        }

        if (orientationProp === 'vertical' || orientationProp === 'v') {
            return 'vertical';
        }

        // Guess from dimensions
        const bounds = block.getBoundingBox();

        if (bounds.w > bounds.h * 2) {
            return 'horizontal'; // Wide = horizontal
        }

        if (bounds.h > bounds.w * 2) {
            return 'vertical'; // Tall = vertical
        }

        return undefined; // Can't determine
    }

    private extractLaneIndex(block: BlockProxy): number | undefined {
        const indexProp = block.properties.get('laneIndex') ||
                         block.properties.get('index');

        if (typeof indexProp === 'number') {
            return indexProp;
        }

        return undefined;
    }

    private extractSwimlaneId(block: BlockProxy): string | undefined {
        const swimlaneIdProp = block.properties.get('swimlaneId') ||
                              block.properties.get('poolId') ||
                              block.properties.get('parentId');

        if (typeof swimlaneIdProp === 'string') {
            return swimlaneIdProp;
        }

        // Try parent
        if (block.parent && block.parent instanceof BlockProxy) {
            return block.parent.id;
        }

        return undefined;
    }

    // ==================== Utilities ====================

    private isWithinBounds(
        inner: { x: number; y: number; w: number; h: number },
        outer: { x: number; y: number; w: number; h: number }
    ): boolean {
        // Check if inner's top-left is within outer
        const topLeftInside = inner.x >= outer.x && inner.y >= outer.y;

        // Check if inner's bottom-right is within outer
        const bottomRightInside =
            (inner.x + inner.w) <= (outer.x + outer.w) &&
            (inner.y + inner.h) <= (outer.y + outer.h);

        return topLeftInside && bottomRightInside;
    }
}
```

---

## 2. Integration with LucidPageAnalyzer

**File:** `editorextensions/quodsi_editor_extension/src/services/conversion/LucidPageAnalyzer.ts`

Add to existing file:

```typescript
import { LaneDetectionService } from '../LaneDetectionService';

export class LucidPageAnalyzer extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LucidPageAnalyzer]';
    private laneDetectionService: LaneDetectionService;

    constructor() {
        super();
        this.setLogging(false);
        // Initialize lane detection service
        this.laneDetectionService = new LaneDetectionService(false);
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

            const previousType = analysis.elementType;

            // ==================== LANE DETECTION ====================
            const laneResult = this.laneDetectionService.detectLane(block, page);

            if (laneResult.isLane) {
                // Lane detected - mark as Resource
                analysis.elementType = SimulationObjectType.Resource;

                this.log(`Block ${blockId} identified as swimlane lane:`, {
                    method: laneResult.method,
                    confidence: laneResult.confidence,
                    laneName: laneResult.laneName,
                    capacity: laneResult.capacity,
                    orientation: laneResult.orientation
                });

                // Store lane metadata for later use
                (analysis as any).laneMetadata = laneResult;

                continue; // Skip other block-specific logic
            }

            // ==================== EXISTING LOGIC ====================
            const blockClass = block.getClassName();

            // ... rest of existing logic ...
        }
    }
}
```

---

## 3. Integration with SelectionHandler

**File:** `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/selection/SelectionHandler.ts`

Add to existing file:

```typescript
import { LaneDetectionService, LaneDetectionResult } from '../../../../services/LaneDetectionService';

export class SelectionHandler {
    private laneDetectionService: LaneDetectionService;

    constructor(
        private client: EditorClient,
        private modelManager: ModelManager,
        private messageRouter: MessageRouter
    ) {
        this.laneDetectionService = new LaneDetectionService(true); // Enable logging
    }

    // ... existing code ...

    private async handleSelectionChange(): Promise<void> {
        const viewport = new Viewport(this.client);
        const items = viewport.getSelectedItems();

        console.log('[SelectionHandler] Selection changed:', items.length, 'items');

        if (items.length === 0) {
            this.handleNoSelection();
            return;
        }

        if (items.length > 1) {
            this.handleMultipleSelection(items);
            return;
        }

        // Single item selected
        const item = items[0];

        // ==================== LANE DETECTION ====================
        if (item instanceof BlockProxy) {
            const page = this.getActivePage();
            const laneResult = this.laneDetectionService.detectLane(item, page);

            if (laneResult.isLane) {
                console.log('[SelectionHandler] Lane selected:', laneResult);
                await this.handleLaneSelection(item, laneResult);
                return;
            }
        }

        // ==================== EXISTING SELECTION LOGIC ====================
        // ... rest of existing logic ...
    }

    private async handleLaneSelection(
        block: BlockProxy,
        laneResult: LaneDetectionResult
    ): Promise<void> {
        // Check if lane is already converted to a Resource
        const metadata = await this.modelManager.getMetadata(block);

        if (!metadata || metadata.type === SimulationObjectType.None) {
            // Unconverted lane
            this.sendLaneConversionPrompt(block, laneResult);
        } else if (metadata.type === SimulationObjectType.Resource) {
            // Already converted to Resource
            this.sendResourceSelection(block, laneResult);
        } else {
            // Converted to something other than Resource (unusual)
            console.warn(
                '[SelectionHandler] Lane converted to unexpected type:',
                metadata.type
            );
            this.sendStandardSelection(block);
        }
    }

    private sendLaneConversionPrompt(
        block: BlockProxy,
        laneResult: LaneDetectionResult
    ): void {
        this.messageRouter.sendMessage({
            type: 'LANE_CONVERSION_PROMPT',
            data: {
                blockId: block.id,
                laneName: laneResult.laneName,
                suggestedCapacity: laneResult.capacity || 1,
                confidence: laneResult.confidence,
                method: laneResult.method,
                orientation: laneResult.orientation
            }
        });
    }

    private sendResourceSelection(
        block: BlockProxy,
        laneResult: LaneDetectionResult
    ): void {
        // Use existing Resource selection message
        // but include lane metadata
        this.messageRouter.sendMessage({
            type: 'RESOURCE_SELECTED',
            data: {
                blockId: block.id,
                isLane: true,
                laneMetadata: laneResult
            }
        });
    }

    private getActivePage(): PageProxy | undefined {
        const document = new DocumentProxy(this.client);
        // Get active page (implementation depends on your setup)
        const pages = Array.from(document.pages.values());
        return pages[0]; // Simplified - get actual active page
    }

    // ... rest of existing code ...
}
```

---

## 4. React UI Components

### Lane Conversion Prompt Component

**File:** `editorextensions/quodsi_editor_extension/quodsim-react/src/features/lanes/LaneConversionPrompt.tsx`

```typescript
import React, { useState } from 'react';

interface LaneConversionPromptProps {
    laneName: string;
    suggestedCapacity: number;
    confidence: 'high' | 'medium' | 'low';
    method: string;
    blockId: string;
    onConvert: (blockId: string, capacity: number) => void;
    onCancel: () => void;
}

export const LaneConversionPrompt: React.FC<LaneConversionPromptProps> = ({
    laneName,
    suggestedCapacity,
    confidence,
    method,
    blockId,
    onConvert,
    onCancel
}) => {
    const [capacity, setCapacity] = useState(suggestedCapacity);

    const confidenceColors = {
        high: 'text-green-600',
        medium: 'text-yellow-600',
        low: 'text-red-600'
    };

    return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold mb-3">
                Swimlane Lane Detected
            </h3>

            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Lane Name
                    </label>
                    <p className="text-lg font-semibold text-blue-700">
                        {laneName}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Detection Confidence
                    </label>
                    <p className={`text-sm ${confidenceColors[confidence]}`}>
                        {confidence.toUpperCase()} (Method: {method})
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="capacity"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Resource Capacity
                    </label>
                    <input
                        type="number"
                        id="capacity"
                        min="1"
                        value={capacity}
                        onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Number of resources available in this lane
                    </p>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-sm text-gray-700">
                        <strong>What happens next:</strong>
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                        <li>Lane will be converted to a Quodsi Resource</li>
                        <li>Activities in this lane will automatically require this resource</li>
                        <li>You can edit resource properties after conversion</li>
                    </ul>
                </div>

                <div className="flex space-x-2 pt-2">
                    <button
                        onClick={() => onConvert(blockId, capacity)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Convert to Resource
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### Integration in QuodsiApp

**File:** `editorextensions/quodsi_editor_extension/quodsim-react/src/QuodsiApp.tsx`

Add to existing file:

```typescript
import { LaneConversionPrompt } from './features/lanes/LaneConversionPrompt';

// ... in component ...

const [showLanePrompt, setShowLanePrompt] = useState(false);
const [lanePromptData, setLanePromptData] = useState<any>(null);

// Message handler
useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        const message = event.data;

        if (message.type === 'LANE_CONVERSION_PROMPT') {
            setShowLanePrompt(true);
            setLanePromptData(message.data);
        }

        // ... existing message handlers ...
    };

    window.addEventListener('message', handleMessage);

    return () => {
        window.removeEventListener('message', handleMessage);
    };
}, []);

const handleLaneConversion = (blockId: string, capacity: number) => {
    // Send conversion message to extension
    window.parent.postMessage({
        type: 'CONVERT_LANE_TO_RESOURCE',
        data: { blockId, capacity }
    }, '*');

    setShowLanePrompt(false);
    setLanePromptData(null);
};

const handleLaneConversionCancel = () => {
    setShowLanePrompt(false);
    setLanePromptData(null);
};

// ... in render ...

return (
    <div className="app">
        {showLanePrompt && lanePromptData && (
            <LaneConversionPrompt
                laneName={lanePromptData.laneName}
                suggestedCapacity={lanePromptData.suggestedCapacity}
                confidence={lanePromptData.confidence}
                method={lanePromptData.method}
                blockId={lanePromptData.blockId}
                onConvert={handleLaneConversion}
                onCancel={handleLaneConversionCancel}
            />
        )}

        {/* ... existing UI ... */}
    </div>
);
```

---

## 5. Automatic Resource Requirement Generation

**File:** `editorextensions/quodsi_editor_extension/src/services/conversion/PageSchemaConversionService.ts`

Add to existing file:

```typescript
import { LaneDetectionService } from '../LaneDetectionService';

export class PageSchemaConversionService extends QuodsiLogger {
    private laneDetectionService: LaneDetectionService;

    constructor() {
        super();
        this.laneDetectionService = new LaneDetectionService();
    }

    // ... existing code ...

    private async convertActivitiesWithLaneRequirements(
        page: PageProxy,
        modelDefinition: ModelDefinition
    ): Promise<void> {
        // First, identify all lanes and their corresponding Resources
        const laneToResourceMap = this.buildLaneToResourceMap(
            page,
            modelDefinition
        );

        // For each Activity, check if it's in a lane
        for (const activity of modelDefinition.model.activities) {
            const activityBlock = page.allBlocks.get(activity.id);

            if (!activityBlock) continue;

            const containingLane = this.findContainingLane(
                activityBlock,
                page,
                laneToResourceMap
            );

            if (containingLane) {
                // Auto-add resource requirement
                await this.addLaneResourceRequirement(
                    activity,
                    containingLane,
                    modelDefinition
                );
            }
        }
    }

    private buildLaneToResourceMap(
        page: PageProxy,
        modelDefinition: ModelDefinition
    ): Map<string, string> {
        const map = new Map<string, string>();

        // Detect all lanes
        const laneResults = this.laneDetectionService.detectAllLanes(page);

        // Match lanes to Resources by ID or name
        for (const [laneBlockId, laneResult] of laneResults) {
            // Find corresponding Resource in model
            const resource = modelDefinition.model.resources.find(
                r => r.id === laneBlockId || r.name === laneResult.laneName
            );

            if (resource) {
                map.set(laneBlockId, resource.id);
            }
        }

        return map;
    }

    private findContainingLane(
        block: BlockProxy,
        page: PageProxy,
        laneToResourceMap: Map<string, string>
    ): string | null {
        const blockBounds = block.getBoundingBox();

        for (const [laneId, resourceId] of laneToResourceMap) {
            const laneBlock = page.allBlocks.get(laneId);

            if (!laneBlock) continue;

            const laneBounds = laneBlock.getBoundingBox();

            if (this.isWithinBounds(blockBounds, laneBounds)) {
                return resourceId;
            }
        }

        return null;
    }

    private async addLaneResourceRequirement(
        activity: Activity,
        resourceId: string,
        modelDefinition: ModelDefinition
    ): Promise<void> {
        // Create resource requirement for this lane
        const requirement = new ResourceRequirement(
            `req_${activity.id}_lane`,
            `Lane Requirement for ${activity.name}`
        );

        requirement.rootClauses = [{
            mode: RequirementMode.REQUIRE_ALL,
            resourceRequests: [{
                resourceId: resourceId,
                quantity: 1,
                priority: 0,
                keepResource: false
            }],
            childClauses: []
        }];

        // Add to model
        modelDefinition.model.resourceRequirements.push(requirement);

        // Link to activity's first operation step
        if (activity.operationSteps.length > 0) {
            activity.operationSteps[0].requirementId = requirement.id;
        } else {
            // Create a default operation step
            activity.operationSteps.push({
                requirementId: requirement.id,
                quantity: 1,
                duration: new Duration(1, PeriodUnit.MINUTES)
            });
        }

        this.log(
            `Auto-added lane resource requirement to Activity ${activity.name}`
        );
    }

    private isWithinBounds(
        inner: { x: number; y: number; w: number; h: number },
        outer: { x: number; y: number; w: number; h: number }
    ): boolean {
        return inner.x >= outer.x &&
               inner.y >= outer.y &&
               (inner.x + inner.w) <= (outer.x + outer.w) &&
               (inner.y + inner.h) <= (outer.y + outer.h);
    }
}
```

---

## 6. Testing Utilities

**File:** `editorextensions/quodsi_editor_extension/src/services/__tests__/LaneDetectionService.test.ts`

```typescript
import { LaneDetectionService } from '../LaneDetectionService';
import { BlockProxy } from 'lucid-extension-sdk';

// Mock BlockProxy
const createMockBlock = (overrides: Partial<BlockProxy> = {}): BlockProxy => {
    const mockProperties = new Map<string, any>();
    const mockTextAreas = new Map<string, string>();

    return {
        id: 'block-123',
        getClassName: () => 'Block',
        properties: mockProperties as any,
        textAreas: mockTextAreas as any,
        parent: null,
        getBoundingBox: () => ({ x: 0, y: 0, w: 100, h: 100 }),
        ...overrides
    } as BlockProxy;
};

describe('LaneDetectionService', () => {
    let service: LaneDetectionService;

    beforeEach(() => {
        service = new LaneDetectionService(false);
    });

    describe('detectLane', () => {
        test('detects lane by class name', () => {
            const block = createMockBlock({
                getClassName: () => 'SwimlaneLane'
            });

            const result = service.detectLane(block);

            expect(result.isLane).toBe(true);
            expect(result.confidence).toBe('high');
            expect(result.method).toBe('className');
        });

        test('detects lane by properties', () => {
            const mockProps = new Map<string, any>();
            mockProps.set('lane', true);
            mockProps.set('laneIndex', 2);

            const block = createMockBlock({
                properties: mockProps as any
            });

            const result = service.detectLane(block);

            expect(result.isLane).toBe(true);
            expect(result.confidence).toBe('high');
            expect(result.method).toBe('properties');
        });

        test('detects lane by parent relationship', () => {
            const parentBlock = createMockBlock({
                getClassName: () => 'SwimlaneContainer'
            });

            const block = createMockBlock({
                parent: parentBlock
            });

            const result = service.detectLane(block);

            expect(result.isLane).toBe(true);
            expect(result.confidence).toBe('medium');
            expect(result.method).toBe('parentChild');
        });

        test('returns false for non-lane blocks', () => {
            const block = createMockBlock({
                getClassName: () => 'ProcessBlock'
            });

            const result = service.detectLane(block);

            expect(result.isLane).toBe(false);
            expect(result.method).toBe('none');
        });
    });

    describe('extractLaneName', () => {
        test('extracts name from text area', () => {
            const mockTextAreas = new Map<string, string>();
            mockTextAreas.set('Label', 'Customer Service (3)');

            const block = createMockBlock({
                getClassName: () => 'Lane',
                textAreas: mockTextAreas as any
            });

            const result = service.detectLane(block);

            expect(result.laneName).toBe('Customer Service');
        });
    });

    describe('extractCapacity', () => {
        test('extracts capacity from text area', () => {
            const mockTextAreas = new Map<string, string>();
            mockTextAreas.set('Label', 'Sales Team (5)');

            const block = createMockBlock({
                getClassName: () => 'Lane',
                textAreas: mockTextAreas as any
            });

            const result = service.detectLane(block);

            expect(result.capacity).toBe(5);
        });

        test('returns undefined when capacity not specified', () => {
            const mockTextAreas = new Map<string, string>();
            mockTextAreas.set('Label', 'Sales Team');

            const block = createMockBlock({
                getClassName: () => 'Lane',
                textAreas: mockTextAreas as any
            });

            const result = service.detectLane(block);

            expect(result.capacity).toBeUndefined();
        });
    });
});
```

---

## 7. Debugging Tools

### Console Inspection Tool

Add to extension for debugging:

**File:** `editorextensions/quodsi_editor_extension/src/extension.ts`

```typescript
import { LaneDetectionService } from './services/LaneDetectionService';

// In extension initialization
const laneDetectionService = new LaneDetectionService(true);

// Add menu item for inspection
menu.addDropdownMenuItem({
    label: 'Debug: Inspect Selected Block',
    action: 'inspect-block-for-lane'
});

client.registerAction('inspect-block-for-lane', () => {
    const viewport = new Viewport(client);
    const items = viewport.getSelectedItems();

    if (items.length === 1 && items[0] instanceof BlockProxy) {
        const block = items[0];
        const page = /* get active page */;

        console.log('==================== BLOCK INSPECTION ====================');
        console.log('ID:', block.id);
        console.log('Class Name:', block.getClassName());
        console.log('');

        console.log('Properties:');
        for (const [key, value] of block.properties) {
            console.log(`  ${key}:`, value);
        }
        console.log('');

        console.log('Text Areas:');
        for (const [key, text] of block.textAreas) {
            console.log(`  ${key}: "${text}"`);
        }
        console.log('');

        console.log('Parent:', block.parent ?
            (block.parent instanceof BlockProxy ? block.parent.getClassName() : 'Not a block') :
            'None'
        );
        console.log('');

        console.log('Bounds:', block.getBoundingBox());
        console.log('');

        // Lane detection
        const laneResult = laneDetectionService.detectLane(block, page);

        console.log('LANE DETECTION RESULT:');
        console.log(laneResult);
        console.log('==================== END INSPECTION ====================');
    } else {
        console.log('Please select a single block');
    }
});
```

### Batch Lane Report

```typescript
menu.addDropdownMenuItem({
    label: 'Debug: Find All Lanes on Page',
    action: 'find-all-lanes'
});

client.registerAction('find-all-lanes', () => {
    const page = /* get active page */;
    const laneResults = laneDetectionService.detectAllLanes(page);

    console.log('==================== ALL LANES ====================');
    console.log(`Found ${laneResults.size} lanes`);
    console.log('');

    for (const [blockId, result] of laneResults) {
        console.log(`Lane: ${result.laneName}`);
        console.log(`  ID: ${blockId}`);
        console.log(`  Capacity: ${result.capacity || 'Not specified'}`);
        console.log(`  Confidence: ${result.confidence}`);
        console.log(`  Method: ${result.method}`);
        console.log(`  Orientation: ${result.orientation || 'Unknown'}`);
        console.log('');
    }

    console.log('==================== END REPORT ====================');
});
```

---

## Usage Examples

### Example 1: Detect Lane on Selection

```typescript
// When user selects a block
const laneResult = laneDetectionService.detectLane(selectedBlock, page);

if (laneResult.isLane) {
    console.log(`Lane detected: ${laneResult.laneName}`);
    console.log(`Capacity: ${laneResult.capacity || 'Not specified'}`);
}
```

### Example 2: Convert All Lanes to Resources

```typescript
// During page conversion
const laneResults = laneDetectionService.detectAllLanes(page);

for (const [laneId, laneResult] of laneResults) {
    const resource = new Resource(
        laneId,
        laneResult.laneName,
        laneResult.capacity || 1
    );

    modelDefinition.model.resources.push(resource);
}
```

### Example 3: Find Activities in Lane

```typescript
const activitiesInLane = laneDetectionService.getActivitiesInLane(
    laneBlock,
    page
);

console.log(`Found ${activitiesInLane.length} activities in this lane`);
```

---

## Next Steps

- **[Testing Guide](./06_testing_guide.md):** Test your implementation thoroughly
- **[Implementation Guide](./04_implementation_guide.md):** Review step-by-step integration

---

**Previous:** [Implementation Guide](./04_implementation_guide.md)

**Next:** [Testing Guide](./06_testing_guide.md)
