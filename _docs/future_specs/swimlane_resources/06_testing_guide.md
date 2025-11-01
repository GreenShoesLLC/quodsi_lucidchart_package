# Testing Guide: Lane Detection and Resource Mapping

## Overview

This guide provides comprehensive testing procedures for validating swimlane lane detection and Resource mapping functionality. Follow these steps to ensure your implementation works correctly across different scenarios.

## Prerequisites

Before testing:

- [ ] `LaneDetectionService` implemented
- [ ] Integration with `LucidPageAnalyzer` complete
- [ ] Integration with `SelectionHandler` complete
- [ ] React UI components created
- [ ] Development environment running (see [Development Documentation](../../development/))

## Testing Phases

### Phase 1: Unit Tests (LaneDetectionService)
Test the detection service in isolation

### Phase 2: Integration Tests (Extension)
Test detection within the LucidChart extension

### Phase 3: End-to-End Tests (Full Workflow)
Test complete user workflow from diagram to simulation

### Phase 4: Edge Cases and Error Handling
Test unusual scenarios and error conditions

---

## Phase 1: Unit Tests

### Test File Setup

**File:** `editorextensions/quodsi_editor_extension/src/services/__tests__/LaneDetectionService.test.ts`

See [Code Examples](./05_code_examples.md#6-testing-utilities) for complete test suite.

### Running Unit Tests

```bash
# From extension directory
cd editorextensions/quodsi_editor_extension

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- LaneDetectionService.test.ts

# Update snapshots if needed
npm test -- -u
```

### Expected Unit Test Results

```
PASS  src/services/__tests__/LaneDetectionService.test.ts
  LaneDetectionService
    detectLane
      ✓ detects lane by class name (5ms)
      ✓ detects lane by properties (3ms)
      ✓ detects lane by parent relationship (4ms)
      ✓ returns false for non-lane blocks (2ms)
    extractLaneName
      ✓ extracts name from text area (3ms)
      ✓ handles missing text areas (2ms)
    extractCapacity
      ✓ extracts capacity from text area (3ms)
      ✓ returns undefined when not specified (2ms)
    extractOrientation
      ✓ detects horizontal orientation (3ms)
      ✓ detects vertical orientation (3ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

---

## Phase 2: Integration Tests (Extension)

### Create Test Diagram

1. Open LucidChart
2. Create a new blank document
3. Add swimlane shapes from Flowchart or BPMN libraries
4. Create test scenarios (see below)

### Test Scenario 1: Basic Horizontal Swimlane

**Setup:**
```
┌─────────────────────────────────────────┐
│ Customer Service (3)                    │
│  [Activity 1] → [Activity 2]            │
├─────────────────────────────────────────┤
│ Sales (2)                               │
│  [Activity 3] → [Activity 4]            │
├─────────────────────────────────────────┤
│ Warehouse                               │
│  [Activity 5] → [Activity 6]            │
└─────────────────────────────────────────┘
```

**Test Steps:**

1. **Enable debugging:**
   - Open browser console (F12)
   - Filter for `[LaneDetectionService]`

2. **Add inspection menu item:**
   - Ensure debug menu items are available (see [Code Examples](./05_code_examples.md#7-debugging-tools))

3. **Inspect first lane:**
   - Select "Customer Service (3)" lane
   - Click "Debug: Inspect Selected Block"
   - Check console output

**Expected Console Output:**

```
==================== BLOCK INSPECTION ====================
ID: block-abc123
Class Name: SwimlaneLane (or similar)

Properties:
  lane: true
  laneIndex: 0
  orientation: horizontal

Text Areas:
  Label: "Customer Service (3)"

Parent: SwimlaneContainer (or similar)

Bounds: { x: 100, y: 100, w: 600, h: 120 }

LANE DETECTION RESULT:
{
  isLane: true,
  confidence: "high",
  method: "className",
  laneName: "Customer Service",
  capacity: 3,
  orientation: "horizontal",
  laneIndex: 0
}
==================== END INSPECTION ====================
```

4. **Repeat for each lane**
   - Verify all 3 lanes detected
   - Verify lane names correct
   - Verify capacities extracted (or undefined for "Warehouse")

5. **Run batch detection:**
   - Click "Debug: Find All Lanes on Page"
   - Verify 3 lanes found

**Expected Batch Output:**

```
==================== ALL LANES ====================
Found 3 lanes

Lane: Customer Service
  ID: block-abc123
  Capacity: 3
  Confidence: high
  Method: className
  Orientation: horizontal

Lane: Sales
  ID: block-def456
  Capacity: 2
  Confidence: high
  Method: className
  Orientation: horizontal

Lane: Warehouse
  ID: block-ghi789
  Capacity: Not specified
  Confidence: high
  Method: className
  Orientation: horizontal

==================== END REPORT ====================
```

### Test Scenario 2: Vertical Swimlane

**Setup:**
```
┌──────────┬──────────┬──────────┐
│ Dev (4)  │ QA (2)   │ Ops (1)  │
│          │          │          │
│ [Task 1] │          │          │
│    ↓     │          │          │
│ [Task 2] │ [Task 3] │          │
│          │    ↓     │          │
│          │ [Task 4] │ [Task 5] │
└──────────┴──────────┴──────────┘
```

**Test Steps:**

1. Select each vertical lane
2. Inspect with debug tool
3. Verify `orientation: "vertical"`
4. Verify detection works same as horizontal

### Test Scenario 3: BPMN Pool and Lanes

**Setup:**
```
┌─────────────────────────────────────────┐
│ Organization A (Pool)                   │
│  ┌─────────────────────────────────┐   │
│  │ Department 1 (Lane)             │   │
│  │  [Process] → [Process]          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Department 2 (Lane)             │   │
│  │  [Process] → [Process]          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Test Steps:**

1. Select each BPMN lane
2. Verify detection (might use "Pool" or "BPMNLane" in class name)
3. Update `LANE_CLASS_KEYWORDS` if needed

### Test Scenario 4: Table-Based Swimlane

**Setup:**

Create a table and use rows as lanes (if applicable)

**Test Steps:**

1. Create table with 3 rows
2. Label each row as a lane
3. Select rows
4. Inspect and check if detected
5. May require updating detection logic for `TableBlockProxy`

---

## Phase 3: End-to-End Tests

### E2E Test 1: Lane to Resource Conversion

**Goal:** Verify complete workflow from lane selection to Resource creation

**Steps:**

1. **Create test diagram:**
   - Add swimlane with 2 lanes:
     - "Manufacturing (5)"
     - "Quality Control (2)"

2. **Start extension in test mode:**
   ```bash
   npx lucid-package@latest test-editor-extension quodsi_editor_extension
   ```

3. **Open Quodsi panel:**
   - Panel should appear in left sidebar

4. **Select first lane:**
   - Click on "Manufacturing (5)" lane

5. **Verify lane detection message:**
   - React panel should show lane conversion prompt
   - Lane name: "Manufacturing"
   - Suggested capacity: 5
   - Confidence indicator: HIGH

6. **Convert to Resource:**
   - Verify capacity pre-filled to 5
   - Click "Convert to Resource"

7. **Verify Resource created:**
   - Open model structure/accordion
   - Should see Resource: "Manufacturing" with capacity 5

8. **Select lane again:**
   - Should now show Resource editor (not conversion prompt)
   - Should be able to edit Resource properties

9. **Repeat for second lane:**
   - Verify "Quality Control" converts with capacity 2

### E2E Test 2: Automatic Activity Requirements

**Goal:** Verify activities in lanes automatically get resource requirements

**Steps:**

1. **Create test diagram:**
   - Swimlane with 2 lanes:
     - "Assembly Line"
     - "Inspection"
   - Add activities to each lane:
     - In Assembly: "Assemble Widget", "Pack Widget"
     - In Inspection: "Quality Check"

2. **Convert page to Quodsi model:**
   - Click "Convert Page" or equivalent
   - (Or convert lanes manually first, then convert page)

3. **Verify lanes became Resources:**
   - Check model structure
   - Should see 2 Resources: "Assembly Line", "Inspection"

4. **Verify activities created:**
   - Should see 3 Activities

5. **Check activity requirements:**
   - Select "Assemble Widget"
   - Check Resource Requirements
   - Should automatically have requirement for "Assembly Line" Resource

6. **Verify other activities:**
   - "Pack Widget" → requires "Assembly Line"
   - "Quality Check" → requires "Inspection"

### E2E Test 3: Simulation with Lane-Based Resources

**Goal:** Verify simulation runs correctly with lane-based Resources

**Steps:**

1. **Create complete model:**
   - Swimlane with 2 lanes (with capacity)
   - Generator
   - Activities in each lane
   - Connectors between activities

2. **Convert to model**

3. **Verify Resource capacities:**
   - Ensure Resources have correct capacities from lanes

4. **Validate model:**
   - Click "Validate"
   - Should pass validation (no errors)

5. **Run simulation:**
   - Configure scenario (duration, replications)
   - Click "Simulate"
   - Wait for completion

6. **Check results:**
   - View simulation results
   - Check Resource utilization
   - Verify Resources from lanes behave correctly

**Expected Results:**

- Resources respect capacity constraints
- Activities queue when Resources at capacity
- Resource utilization statistics available

---

## Phase 4: Edge Cases and Error Handling

### Edge Case 1: Lane Without Capacity

**Test:**

1. Create lane with label: "Sales Team" (no capacity number)
2. Select lane
3. Verify conversion prompt shows suggested capacity: 1
4. User can override capacity

**Expected:** Defaults to capacity 1, allows user input

### Edge Case 2: Lane with Unusual Capacity Format

**Test:**

Different capacity formats:

- "Customer Service - 3 agents"
- "Warehouse (Capacity: 5)"
- "Support Team | 4 people"

**Expected:**
- May not auto-extract capacity
- Defaults to 1
- User can input correct capacity

### Edge Case 3: Nested Swimlanes

**Test:**

1. Create swimlane within swimlane (if supported)
2. Select inner lane
3. Verify detection works

**Expected:** Parent-child detection should handle

### Edge Case 4: Lane Spanning Multiple Pages

**Test:**

If LucidChart allows multi-page swimlanes:

1. Create swimlane across pages
2. Test detection on each page

**Expected:** Each page detects independently

### Edge Case 5: Custom Swimlane Shape

**Test:**

1. User creates custom swimlane-like shape
2. Labels it as a lane
3. Select it

**Expected:**
- May not be detected automatically
- User can manually convert to Resource

### Edge Case 6: Empty Lane (No Activities)

**Test:**

1. Create lane with no activities inside
2. Convert to Resource

**Expected:**
- Resource created successfully
- Can be used by activities added later

### Edge Case 7: Activity Spanning Multiple Lanes

**Test:**

1. Create activity that overlaps 2 lanes

**Expected:**
- Activity assigned to lane with majority overlap
- Or: User prompted to choose lane
- Or: Multiple resource requirements created

### Error Handling Test 1: Detection Failure

**Test:**

Simulate detection failure:

```typescript
// Temporarily break detection
const result = { isLane: false, confidence: 'high', method: 'none', laneName: '' };
```

**Expected:**
- No errors thrown
- Block treated as regular block
- User can still manually convert if desired

### Error Handling Test 2: Missing Metadata

**Test:**

1. Convert lane to Resource
2. Manually delete Resource from model
3. Select lane again

**Expected:**
- Lane re-detected as unconverted
- User can convert again

### Error Handling Test 3: Conversion Interruption

**Test:**

1. Start lane conversion
2. Interrupt (close panel, switch pages)
3. Return to lane

**Expected:**
- Conversion rolled back or completed
- No partial state

---

## Testing Checklist

### Detection Tests

- [ ] Horizontal swimlane lanes detected
- [ ] Vertical swimlane lanes detected
- [ ] BPMN pool/lanes detected
- [ ] Table-based lanes detected (if applicable)
- [ ] Parent-child lanes detected
- [ ] Nested lanes detected
- [ ] Custom lanes handled

### Metadata Extraction Tests

- [ ] Lane name extracted from text area
- [ ] Lane name extracted from properties
- [ ] Capacity extracted from label: "Name (N)"
- [ ] Capacity extracted from properties
- [ ] Capacity defaults to undefined when not found
- [ ] Orientation detected (horizontal/vertical)
- [ ] Lane index extracted
- [ ] Parent swimlane ID extracted

### Conversion Tests

- [ ] Lane converts to Resource
- [ ] Resource has correct name
- [ ] Resource has correct capacity
- [ ] Conversion UI shows correct data
- [ ] User can override capacity
- [ ] Converted lane shows Resource editor on re-selection

### Automatic Requirements Tests

- [ ] Activities in lane get resource requirement
- [ ] Requirement references correct Resource
- [ ] Multiple activities in same lane share Resource
- [ ] Activities in different lanes get different requirements
- [ ] Activities outside lanes have no auto-requirements

### UI Tests

- [ ] Lane conversion prompt displays
- [ ] Confidence level shown correctly
- [ ] Detection method displayed
- [ ] Capacity input works
- [ ] Convert button works
- [ ] Cancel button works
- [ ] Resource editor shows for converted lanes

### Simulation Tests

- [ ] Simulation runs with lane-based Resources
- [ ] Resource capacity enforced
- [ ] Resource utilization tracked
- [ ] Results display correctly

### Error Handling Tests

- [ ] Detection failure handled gracefully
- [ ] Missing capacity defaults correctly
- [ ] Invalid capacity input rejected
- [ ] Conversion errors shown to user
- [ ] Partial conversions prevented

---

## Troubleshooting

### Issue: Lane Not Detected

**Symptoms:**
- Selecting lane shows normal block editor
- Console shows `isLane: false`

**Diagnosis:**

1. **Inspect block:**
   - Use debug inspection tool
   - Check class name
   - Check properties
   - Check parent

2. **Check class name keywords:**
   - Is class name in `LANE_CLASS_KEYWORDS`?
   - Add if missing

3. **Check property names:**
   - Does block have lane-related properties?
   - Add to `LANE_PROPERTY_NAMES` if needed

**Solution:**

Update detection keywords based on actual class names/properties found.

### Issue: Capacity Not Extracted

**Symptoms:**
- Lane detected correctly
- Capacity shows as `undefined` or `1`

**Diagnosis:**

1. **Check text area:**
   - What's the exact format?
   - Does it match regex: `/\((\d+)\)/`?

2. **Check properties:**
   - Does block have `capacity` property?

**Solution:**

- Update capacity extraction regex
- Parse different formats
- Default to 1 and allow user input

### Issue: Activities Not Getting Requirements

**Symptoms:**
- Lane converts to Resource
- Activities don't have resource requirements

**Diagnosis:**

1. **Check containment detection:**
   - Are activities truly within lane bounds?
   - Check bounding box overlap logic

2. **Check conversion order:**
   - Are lanes converted before activities?
   - Is lane-to-resource map populated?

**Solution:**

- Fix bounding box containment logic
- Ensure proper conversion order
- Add logging to track requirement creation

### Issue: React UI Not Showing

**Symptoms:**
- Lane detected in extension
- React panel doesn't show prompt

**Diagnosis:**

1. **Check message passing:**
   - Is `LANE_CONVERSION_PROMPT` message sent?
   - Is React listening for messages?

2. **Check React state:**
   - Is `showLanePrompt` state updating?
   - Any React errors in console?

**Solution:**

- Verify message type spelling
- Check React message handler registration
- Add console logs to trace message flow

---

## Performance Testing

### Test Large Diagram

**Setup:**
- Swimlane with 10+ lanes
- 50+ activities across lanes

**Measure:**

1. **Detection time:**
   - Time to detect all lanes
   - Should be < 100ms for 10 lanes

2. **Conversion time:**
   - Time to convert all lanes to Resources
   - Should be < 500ms

3. **Requirement generation time:**
   - Time to add requirements to 50 activities
   - Should be < 1 second

**Acceptance Criteria:**

- No UI lag during detection
- Smooth conversion process
- No browser performance warnings

---

## Regression Testing

After making changes, re-run:

### Quick Regression Suite

1. [ ] Unit tests pass
2. [ ] Basic horizontal swimlane detection works
3. [ ] Lane conversion to Resource works
4. [ ] Resource editor shows for converted lane
5. [ ] Activities in lane get requirements

### Full Regression Suite

1. [ ] All unit tests pass
2. [ ] All integration tests pass
3. [ ] All E2E scenarios pass
4. [ ] All edge cases handled
5. [ ] Performance acceptable

---

## Test Data

### Sample Diagrams

Create these test diagrams in LucidChart:

**Test Diagram 1: Basic Horizontal**
- 3 horizontal lanes with capacity
- 6 activities (2 per lane)
- Simple linear flow

**Test Diagram 2: Basic Vertical**
- 3 vertical lanes with capacity
- 6 activities (2 per lane)
- Parallel flows

**Test Diagram 3: BPMN**
- BPMN pool with 2 lanes
- BPMN activities and gateways
- Message flows between pools

**Test Diagram 4: Complex**
- Mix of horizontal and vertical lanes
- Nested structures
- 20+ activities
- Multiple flows

**Test Diagram 5: Edge Cases**
- Lanes without capacity
- Lanes with unusual names
- Empty lanes
- Overlapping activities

---

## Reporting Bugs

When reporting lane detection issues, include:

1. **LucidChart Diagram:**
   - Share link or export
   - Screenshot

2. **Console Logs:**
   - Debug inspection output
   - Error messages

3. **Expected vs Actual:**
   - What should happen
   - What actually happened

4. **Environment:**
   - Browser and version
   - Extension version
   - LucidChart account type

5. **Steps to Reproduce:**
   - Exact steps
   - Minimal test case

---

## Next Steps

After completing testing:

1. **Document findings:**
   - Update keywords lists if needed
   - Note any swimlane types not yet supported

2. **Iterate on implementation:**
   - Fix bugs found
   - Enhance detection for edge cases

3. **User acceptance testing:**
   - Have real users test with their diagrams
   - Gather feedback

4. **Production deployment:**
   - See [Deployment Documentation](../../infrastructure/deployment/)

---

**Previous:** [Code Examples](./05_code_examples.md)

**Back to:** [README](./README.md)
