# Phase 2: UI Implementation

## Overview

Phase 2 focuses on implementing the UI components needed to support distribution-based durations. Building on the type system changes from Phase 1, this phase develops the components that allow users to interact with distributions in the Quodsi interface.

## Goals

1. Create the EnhancedDurationEditor component to replace CompactDurationEditor
2. Implement parameter editors for each supported distribution type
3. Replace existing duration editors with the new component
4. Ensure the UI fits within space constraints

## Tasks

### 1. Create Distribution Type Selector

- **New File**: `quodsim-react/src/components/distribution/DistributionTypeSelector.tsx`
- **Changes**:
  - Create dropdown component for selecting distribution types
  - Group options by category (common vs. advanced)
  - Display formatted names for distribution types

**Estimated Time**: 2 days

### 2. Create Parameter Editors

- **New Files**:
  - `quodsim-react/src/components/distribution/parameters/ConstantParametersEditor.tsx`
  - `quodsim-react/src/components/distribution/parameters/UniformParametersEditor.tsx`
  - `quodsim-react/src/components/distribution/parameters/TriangularParametersEditor.tsx`
  - `quodsim-react/src/components/distribution/parameters/NormalParametersEditor.tsx`
- **Changes**:
  - Create specialized parameter editors for each distribution type
  - Implement validation logic
  - Ensure consistent UI patterns

**Estimated Time**: 4 days

### 3. Create Distribution Parameters Editor

- **New File**: `quodsim-react/src/components/distribution/DistributionParametersEditor.tsx`
- **Changes**:
  - Create container component that switches between parameter editors
  - Handle distribution creation and updates
  - Manage parameter validation

**Estimated Time**: 2 days

### 4. Create Enhanced Duration Editor

- **New File**: `quodsim-react/src/components/EnhancedDurationEditor.tsx`
- **Changes**:
  - Create main duration editor component
  - Integrate distribution type selector and parameters editor
  - Handle conversion between formats
  - Support compact mode for space-constrained contexts

**Estimated Time**: 3 days

### 5. Replace Existing Editors

- **File**: `quodsim-react/src/components/OperationStepEditor.tsx`
- **File**: `quodsim-react/src/components/ActivityEditor.tsx`
- **Changes**:
  - Update imports to use EnhancedDurationEditor
  - Adjust layout as needed for the new component
  - Ensure proper migration of existing data

**Estimated Time**: 2 days

## Dependencies

- Phase 1: Core Type Changes must be completed

## Deliverables

1. Distribution Type Selector component
2. Parameter editor components for each distribution type
3. Distribution Parameters Editor component
4. Enhanced Duration Editor component
5. Updated operation step and activity editors

## Testing Plan

### Unit Tests

1. **Distribution Type Selector Tests**:
   - Test selection change events
   - Test display name formatting

2. **Parameter Editor Tests**:
   - Test input validation
   - Test change events
   - Test default values

3. **Distribution Parameters Editor Tests**:
   - Test switching between parameter editors
   - Test parameter updates

4. **Enhanced Duration Editor Tests**:
   - Test format conversion
   - Test distribution type changes
   - Test parameter updates
   - Test period unit changes

### Integration Tests

1. **Editor Integration Tests**:
   - Test EnhancedDurationEditor in Operation Step Editor
   - Test model updates when duration changes

### UI Tests

1. **Visual Tests**:
   - Test layout in different contexts
   - Test compact mode
   - Test responsiveness
   - Verify the UI fits within the 300px width constraint

2. **User Flow Tests**:
   - Test complete user journey for changing distribution types
   - Test parameter input and validation feedback

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex UI in limited space | High | Use compact mode, collapsible sections, tooltips |
| Parameter validation UX | Medium | Clear error messages, prevent invalid states |
| Migration of existing data | Medium | Test with real models, provide fallbacks |
| Performance with dynamic components | Low | Optimize rerenders, use memoization |

## Acceptance Criteria

1. EnhancedDurationEditor component renders correctly in all contexts
2. Users can switch between distribution types
3. Parameter editors display appropriate fields for each distribution
4. All inputs are properly validated
5. Changes to distributions are correctly propagated to the model
6. UI fits within space constraints
7. All unit, integration, and UI tests pass

## Next Steps

Upon completion of Phase 2, proceed to Phase 3: Python Integration
